import { prisma } from "../config/db.js";
import { getFinanceStats } from "./payment.service.js";
import { hasPermission, PERMISSIONS, ROLES, normalizeRole } from "../constants/roles.js";
import { requireLinkedDoctor } from "../utils/rbac.js";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDashboardStats(user) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const role = normalizeRole(user.role);
  const doctorId = role === ROLES.DOCTOR ? requireLinkedDoctor(user) : null;
  const doctorFilter = doctorId ? { doctorId } : {};
  const canFinance = hasPermission(role, PERMISSIONS.FINANCE_READ, user.permissions);

  const [
    totalAppointments,
    todaysAppointments,
    pendingRequests,
    activeDoctors,
    activeMemberships,
    finance,
  ] = await Promise.all([
    prisma.appointment.count({ where: doctorFilter }),
    prisma.appointment.count({
      where: {
        ...doctorFilter,
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.appointment.count({
      where: { ...doctorFilter, status: "PENDING" },
    }),
    doctorId
      ? Promise.resolve(1)
      : prisma.doctor.count({ where: { isActive: true } }),
    canFinance
      ? prisma.patientMembership.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(0),
    canFinance ? getFinanceStats() : Promise.resolve(null),
  ]);

  let totalPatients;
  if (doctorId) {
    totalPatients = await prisma.patient.count({
      where: { appointments: { some: { doctorId } } },
    });
  } else {
    totalPatients = await prisma.patient.count();
  }

  const recentAppointments = await prisma.appointment.findMany({
    where: doctorFilter,
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, title: true } },
    },
  });

  return {
    role,
    totalAppointments,
    todaysAppointments,
    totalPatients,
    revenue: finance?.totalRevenue ?? 0,
    pendingRequests,
    activeDoctors,
    activeMemberships,
    finance,
    recentAppointments,
  };
}
