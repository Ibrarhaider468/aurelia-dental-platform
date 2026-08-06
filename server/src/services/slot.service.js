import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { generateTimeSlots } from "../utils/slots.js";
import {
  formatDateISO,
  isPastDate,
  isPastDateTime,
  toDateOnlyUTC,
} from "../utils/sanitize.js";

const DAY_MAP = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "RESCHEDULED"];

export async function getAvailableSlots(doctorId, dateStr, { excludeAppointmentId } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new AppError("Date must be YYYY-MM-DD", 400);
  }
  if (isPastDate(dateStr)) {
    return {
      date: dateStr,
      day: null,
      slots: [],
      slotBoard: [],
      bookedCount: 0,
      availableCount: 0,
      reason: "Past dates cannot be booked",
    };
  }

  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, isActive: true },
  });
  if (!doctor) throw new AppError("Doctor not found", 404);

  const dateUTC = toDateOnlyUTC(dateStr);

  const [holiday, leave] = await Promise.all([
    prisma.clinicHoliday.findUnique({ where: { date: dateUTC } }),
    prisma.doctorLeave.findUnique({
      where: { doctorId_date: { doctorId, date: dateUTC } },
    }),
  ]);

  if (holiday) {
    return {
      date: dateStr,
      day: DAY_MAP[new Date(`${dateStr}T00:00:00`).getDay()],
      slots: [],
      slotBoard: [],
      bookedCount: 0,
      availableCount: 0,
      reason: `Clinic closed: ${holiday.title}`,
    };
  }

  if (leave) {
    return {
      date: dateStr,
      day: DAY_MAP[new Date(`${dateStr}T00:00:00`).getDay()],
      slots: [],
      slotBoard: [],
      bookedCount: 0,
      availableCount: 0,
      reason: leave.reason || "Dentist is on leave",
    };
  }

  const day = DAY_MAP[new Date(`${dateStr}T00:00:00`).getDay()];
  const availability = await prisma.availability.findFirst({
    where: { doctorId, day, isActive: true },
  });

  if (!availability) {
    return {
      date: dateStr,
      day,
      slots: [],
      slotBoard: [],
      bookedCount: 0,
      availableCount: 0,
      reason: "Dentist is not available on this day",
    };
  }

  const allSlots = generateTimeSlots({
    startTime: availability.startTime,
    endTime: availability.endTime,
    breakStart: availability.breakStart,
    breakEnd: availability.breakEnd,
    slotMinutes: availability.slotMinutes,
  });

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: dateUTC,
      status: { in: ACTIVE_STATUSES },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { slot: true },
  });

  const bookedSet = new Set(booked.map((b) => b.slot));

  /** Full board for UI: available (white) / booked (black) / past */
  const slotBoard = allSlots.map((slot) => {
    if (bookedSet.has(slot)) {
      return { time: slot, status: "booked", available: false };
    }
    if (isPastDateTime(dateStr, slot)) {
      return { time: slot, status: "past", available: false };
    }
    return { time: slot, status: "available", available: true };
  });

  // Keep string list for booking validation + existing clients
  const slots = slotBoard.filter((s) => s.available).map((s) => s.time);

  return {
    date: dateStr,
    day,
    slotMinutes: availability.slotMinutes,
    workingHours: {
      startTime: availability.startTime,
      endTime: availability.endTime,
      breakStart: availability.breakStart,
      breakEnd: availability.breakEnd,
    },
    slots,
    slotBoard,
    bookedCount: bookedSet.size,
    availableCount: slots.length,
    reason: slots.length ? null : "No open slots for this date",
  };
}

export async function assertSlotBookable({
  doctorId,
  date,
  slot,
  excludeAppointmentId,
}) {
  const availability = await getAvailableSlots(doctorId, date, {
    excludeAppointmentId,
  });
  if (!availability.slots.includes(slot)) {
    throw new AppError(
      availability.reason || "Selected time slot is not available",
      409,
    );
  }
  return availability;
}

export async function listCalendarAppointments({
  from,
  to,
  doctorId,
} = {}) {
  const fromDate = from ? toDateOnlyUTC(from) : undefined;
  const toDate = to ? toDateOnlyUTC(to) : undefined;

  return prisma.appointment.findMany({
    where: {
      ...(doctorId ? { doctorId } : {}),
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, title: true } },
      patient: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { slot: "asc" }],
  });
}

