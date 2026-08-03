import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { invalidateWebsiteCache } from "./public.service.js";

function normalizeEmpty(value) {
  if (value === "" || value === undefined) return null;
  return value;
}

export async function listDoctors({ search } = {}) {
  return prisma.doctor.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { specialization: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      availabilities: { orderBy: { day: "asc" } },
      user: { select: { id: true, email: true, role: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getDoctor(id) {
  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      availabilities: { orderBy: { day: "asc" } },
      user: { select: { id: true, email: true, role: true } },
    },
  });
  if (!doctor) throw new AppError("Doctor not found", 404);
  return doctor;
}

export async function createDoctor(data) {
  const doctor = await prisma.doctor.create({
    data: {
      name: data.name,
      image: normalizeEmpty(data.image),
      qualification: normalizeEmpty(data.qualification),
      experience: data.experience ?? null,
      specialization: normalizeEmpty(data.specialization),
      bio: normalizeEmpty(data.bio),
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      userId: normalizeEmpty(data.userId),
    },
    include: { availabilities: true },
  });
  invalidateWebsiteCache();
  return doctor;
}

export async function updateDoctor(id, data) {
  await getDoctor(id);
  const doctor = await prisma.doctor.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.image !== undefined ? { image: normalizeEmpty(data.image) } : {}),
      ...(data.qualification !== undefined
        ? { qualification: normalizeEmpty(data.qualification) }
        : {}),
      ...(data.experience !== undefined ? { experience: data.experience } : {}),
      ...(data.specialization !== undefined
        ? { specialization: normalizeEmpty(data.specialization) }
        : {}),
      ...(data.bio !== undefined ? { bio: normalizeEmpty(data.bio) } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.userId !== undefined ? { userId: normalizeEmpty(data.userId) } : {}),
    },
    include: { availabilities: true },
  });
  invalidateWebsiteCache();
  return doctor;
}

export async function deleteDoctor(id) {
  await getDoctor(id);
  const activeBookings = await prisma.appointment.count({
    where: {
      doctorId: id,
      status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] },
    },
  });
  if (activeBookings > 0) {
    throw new AppError(
      "Cannot delete doctor with active appointments. Cancel or reassign them first.",
      400,
    );
  }
  await prisma.doctor.delete({ where: { id } });
  invalidateWebsiteCache();
  return { message: "Doctor deleted" };
}

export async function upsertAvailability(doctorId, data) {
  await getDoctor(doctorId);
  return prisma.availability.upsert({
    where: {
      doctorId_day: { doctorId, day: data.day },
    },
    create: {
      doctorId,
      day: data.day,
      startTime: data.startTime,
      endTime: data.endTime,
      breakStart: normalizeEmpty(data.breakStart),
      breakEnd: normalizeEmpty(data.breakEnd),
      slotMinutes: data.slotMinutes ?? 30,
      isActive: data.isActive ?? true,
    },
    update: {
      startTime: data.startTime,
      endTime: data.endTime,
      breakStart: normalizeEmpty(data.breakStart),
      breakEnd: normalizeEmpty(data.breakEnd),
      slotMinutes: data.slotMinutes ?? 30,
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deleteAvailability(doctorId, availabilityId) {
  const row = await prisma.availability.findFirst({
    where: { id: availabilityId, doctorId },
  });
  if (!row) throw new AppError("Availability not found", 404);
  await prisma.availability.delete({ where: { id: availabilityId } });
  return { message: "Availability deleted" };
}
