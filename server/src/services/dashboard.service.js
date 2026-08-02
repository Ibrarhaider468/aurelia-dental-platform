import { prisma } from "../config/db.js";
import { getFinanceStats } from "./payment.service.js";

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

export async function getDashboardStats() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [
    totalAppointments,
    todaysAppointments,
    totalPatients,
    pendingRequests,
    activeDoctors,
    activeMemberships,
    finance,
  ] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.patient.count(),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.patientMembership.count({ where: { status: "ACTIVE" } }),
    getFinanceStats(),
  ]);

  const recentAppointments = await prisma.appointment.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, title: true } },
    },
  });

  return {
    totalAppointments,
    todaysAppointments,
    totalPatients,
    revenue: finance.totalRevenue,
    pendingRequests,
    activeDoctors,
    activeMemberships,
    finance,
    recentAppointments,
  };
}
