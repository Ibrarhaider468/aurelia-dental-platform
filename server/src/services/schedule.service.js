import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { sanitizeString, toDateOnlyUTC } from "../utils/sanitize.js";

export async function listHolidays() {
  return prisma.clinicHoliday.findMany({ orderBy: { date: "asc" } });
}

export async function createHoliday(data) {
  return prisma.clinicHoliday.create({
    data: {
      date: toDateOnlyUTC(data.date),
      title: sanitizeString(data.title, { max: 120 }),
    },
  });
}

export async function deleteHoliday(id) {
  await prisma.clinicHoliday.delete({ where: { id } });
  return { message: "Holiday deleted" };
}

export async function listDoctorLeaves(doctorId) {
  return prisma.doctorLeave.findMany({
    where: doctorId ? { doctorId } : undefined,
    include: { doctor: { select: { id: true, name: true } } },
    orderBy: { date: "asc" },
  });
}

export async function createDoctorLeave(doctorId, data) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) throw new AppError("Doctor not found", 404);

  return prisma.doctorLeave.create({
    data: {
      doctorId,
      date: toDateOnlyUTC(data.date),
      reason: sanitizeString(data.reason, { max: 500 }) || null,
    },
  });
}

export async function deleteDoctorLeave(doctorId, leaveId) {
  const leave = await prisma.doctorLeave.findFirst({
    where: { id: leaveId, doctorId },
  });
  if (!leave) throw new AppError("Leave day not found", 404);
  await prisma.doctorLeave.delete({ where: { id: leaveId } });
  return { message: "Leave day deleted" };
}
