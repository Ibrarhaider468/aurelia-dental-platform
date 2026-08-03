import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { notifyBookingReceived, notifyBookingStatus } from "./email.service.js";
import { assertSlotBookable } from "./slot.service.js";
import {
  sanitizeEmail,
  sanitizePhone,
  sanitizeString,
  toDateOnlyUTC,
} from "../utils/sanitize.js";

function parseDateOnly(value) {
  return toDateOnlyUTC(value);
}

async function ensurePatient({ patientId, patientName, email, phone }) {
  if (patientId) {
    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!existing) throw new AppError("Patient not found", 404);
    return existing.id;
  }

  const normalizedEmail = sanitizeEmail(email);
  const byEmail = await prisma.patient.findUnique({
    where: { email: normalizedEmail },
  });
  if (byEmail) return byEmail.id;

  const created = await prisma.patient.create({
    data: {
      name: sanitizeString(patientName, { max: 120 }),
      email: normalizedEmail,
      phone: sanitizePhone(phone),
    },
  });
  return created.id;
}

export async function listAppointments({
  status,
  search,
  doctorId,
  dateFrom,
  dateTo,
} = {}) {
  return prisma.appointment.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: parseDateOnly(dateFrom) } : {}),
              ...(dateTo ? { lte: parseDateOnly(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { patientName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, title: true, price: true } },
      patient: { select: { id: true, name: true } },
      payment: true,
    },
    orderBy: [{ date: "desc" }, { slot: "asc" }],
  });
}

export async function getAppointment(id) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      doctor: true,
      service: true,
      patient: true,
      payment: true,
    },
  });
  if (!appointment) throw new AppError("Appointment not found", 404);
  return appointment;
}

export async function createAppointment(data) {
  const patientName = sanitizeString(data.patientName, { max: 120 });
  const email = sanitizeEmail(data.email);
  const phone = sanitizePhone(data.phone);

  await assertSlotBookable({
    doctorId: data.doctorId,
    date: data.date,
    slot: data.slot,
  });

  const patientId = await ensurePatient({
    patientId: data.patientId,
    patientName,
    email,
    phone,
  });

  const appointment = await prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        date: parseDateOnly(data.date),
        slot: data.slot,
        status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] },
      },
    });
    if (conflict) {
      throw new AppError("This time slot is already booked for the doctor", 409);
    }

    return tx.appointment.create({
      data: {
        patientId,
        patientName,
        email,
        phone,
        doctorId: data.doctorId,
        serviceId: data.serviceId,
        date: parseDateOnly(data.date),
        slot: data.slot,
        message: sanitizeString(data.message, { max: 2000 }) || null,
        adminNotes: sanitizeString(data.adminNotes, { max: 2000 }) || null,
        status: data.status || "PENDING",
      },
      include: {
        doctor: { select: { id: true, name: true } },
        service: { select: { id: true, title: true } },
      },
    });
  });

  if (appointment.status === "PENDING") {
    await notifyBookingReceived(appointment);
  } else {
    await notifyBookingStatus(appointment, appointment.status);
  }

  return appointment;
}

export async function updateAppointment(id, data) {
  const current = await getAppointment(id);
  const nextDoctorId = data.doctorId ?? current.doctorId;
  const nextDate = data.date ?? current.date.toISOString().slice(0, 10);
  const nextSlot = data.slot ?? current.slot;
  const nextStatus = data.status ?? current.status;

  const scheduleChanging =
    data.doctorId !== undefined ||
    data.date !== undefined ||
    data.slot !== undefined;

  if (
    scheduleChanging &&
    ["PENDING", "CONFIRMED", "RESCHEDULED"].includes(nextStatus)
  ) {
    await assertSlotBookable({
      doctorId: nextDoctorId,
      date: typeof nextDate === "string" ? nextDate : nextDate.toISOString().slice(0, 10),
      slot: nextSlot,
      excludeAppointmentId: id,
    });
  }

  const appointment = await prisma.$transaction(async (tx) => {
    if (
      scheduleChanging &&
      ["PENDING", "CONFIRMED", "RESCHEDULED"].includes(nextStatus)
    ) {
      const conflict = await tx.appointment.findFirst({
        where: {
          id: { not: id },
          doctorId: nextDoctorId,
          date: parseDateOnly(
            typeof nextDate === "string"
              ? nextDate
              : nextDate.toISOString().slice(0, 10),
          ),
          slot: nextSlot,
          status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] },
        },
      });
      if (conflict) {
        throw new AppError("This time slot is already booked for the doctor", 409);
      }
    }

    return tx.appointment.update({
      where: { id },
      data: {
        ...(data.status !== undefined
          ? { status: data.status, previousStatus: current.status }
          : {}),
        ...(data.doctorId !== undefined ? { doctorId: data.doctorId } : {}),
        ...(data.serviceId !== undefined ? { serviceId: data.serviceId } : {}),
        ...(data.date !== undefined ? { date: parseDateOnly(data.date) } : {}),
        ...(data.slot !== undefined ? { slot: data.slot } : {}),
        ...(data.message !== undefined
          ? { message: sanitizeString(data.message, { max: 2000 }) }
          : {}),
        ...(data.adminNotes !== undefined
          ? { adminNotes: sanitizeString(data.adminNotes, { max: 2000 }) }
          : {}),
        ...(data.rescheduleReason !== undefined
          ? {
              rescheduleReason: sanitizeString(data.rescheduleReason, {
                max: 500,
              }),
            }
          : {}),
        ...(data.patientName !== undefined
          ? { patientName: sanitizeString(data.patientName, { max: 120 }) }
          : {}),
        ...(data.email !== undefined ? { email: sanitizeEmail(data.email) } : {}),
        ...(data.phone !== undefined ? { phone: sanitizePhone(data.phone) } : {}),
        ...(scheduleChanging
          ? {
              reminder24Sent: false,
              reminder12Sent: false,
              reminder24SentAt: null,
              reminder12SentAt: null,
            }
          : {}),
      },
      include: {
        doctor: { select: { id: true, name: true } },
        service: { select: { id: true, title: true } },
      },
    });
  });

  const statusChanged = Boolean(data.status && data.status !== current.status);
  if (statusChanged) {
    await notifyBookingStatus(appointment, appointment.status);
  } else if (
    scheduleChanging &&
    ["PENDING", "CONFIRMED", "RESCHEDULED"].includes(appointment.status)
  ) {
    await notifyBookingStatus(
      { ...appointment, status: "RESCHEDULED" },
      "RESCHEDULED",
    );
  }

  return appointment;
}

export async function deleteAppointment(id) {
  await getAppointment(id);
  await prisma.appointment.delete({ where: { id } });
  return { message: "Appointment deleted" };
}

export function appointmentsToCsv(rows) {
  const header = [
    "id",
    "patientName",
    "email",
    "phone",
    "doctor",
    "service",
    "date",
    "slot",
    "status",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const values = [
      row.id,
      row.patientName,
      row.email,
      row.phone,
      row.doctor?.name || "",
      row.service?.title || "",
      new Date(row.date).toISOString().slice(0, 10),
      row.slot,
      row.status,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    lines.push(values.join(","));
  }
  return `${lines.join("\n")}\n`;
}
