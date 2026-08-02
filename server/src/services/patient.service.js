import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import {
  sanitizeEmail,
  sanitizePhone,
  sanitizeString,
} from "../utils/sanitize.js";

export async function listPatients({ search } = {}) {
  return prisma.patient.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: {
        select: { appointments: true, payments: true, memberships: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPatient(id) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { date: "desc" },
        include: {
          doctor: { select: { id: true, name: true } },
          service: { select: { id: true, title: true, price: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      memberships: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      },
      clinicalNotes: { orderBy: { createdAt: "desc" } },
      insuranceDetails: {
        include: { provider: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!patient) throw new AppError("Patient not found", 404);

  const previousTreatments = [
    ...new Set(
      patient.appointments
        .filter((a) => ["COMPLETED", "CONFIRMED"].includes(a.status))
        .map((a) => a.service?.title)
        .filter(Boolean),
    ),
  ];

  return { ...patient, previousTreatments };
}

export async function createPatient(data) {
  return prisma.patient.create({
    data: {
      name: sanitizeString(data.name, { max: 120 }),
      email: sanitizeEmail(data.email),
      phone: sanitizePhone(data.phone),
      medicalNotes: sanitizeString(data.medicalNotes, { max: 5000 }) || null,
    },
  });
}

export async function updatePatient(id, data) {
  await getPatient(id);
  return prisma.patient.update({
    where: { id },
    data: {
      ...(data.name !== undefined
        ? { name: sanitizeString(data.name, { max: 120 }) }
        : {}),
      ...(data.email !== undefined ? { email: sanitizeEmail(data.email) } : {}),
      ...(data.phone !== undefined ? { phone: sanitizePhone(data.phone) } : {}),
      ...(data.medicalNotes !== undefined
        ? { medicalNotes: sanitizeString(data.medicalNotes, { max: 5000 }) }
        : {}),
    },
  });
}

export async function deletePatient(id) {
  await getPatient(id);
  await prisma.patient.delete({ where: { id } });
  return { message: "Patient deleted" };
}

export async function addPatientNote(patientId, note, createdBy) {
  await getPatient(patientId);
  return prisma.patientNote.create({
    data: {
      patientId,
      note: sanitizeString(note, { max: 5000 }),
      createdBy: createdBy || null,
    },
  });
}
