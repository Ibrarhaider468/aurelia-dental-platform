import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { sanitizeString } from "../utils/sanitize.js";
import { env } from "../config/env.js";

export async function listPayments({
  status,
  search,
  patientId,
  appointmentId,
  method,
  gateway,
} = {}) {
  return prisma.payment.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
      ...(appointmentId ? { appointmentId } : {}),
      ...(method ? { method } : {}),
      ...(gateway ? { gateway } : {}),
      ...(search
        ? {
            OR: [
              { providerRef: { contains: search, mode: "insensitive" } },
              { checkoutSession: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
              { patient: { name: { contains: search, mode: "insensitive" } } },
              { patient: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      appointment: {
        select: { id: true, date: true, slot: true, status: true, patientName: true },
      },
      membership: {
        select: {
          id: true,
          status: true,
          plan: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPayment(id) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      patient: true,
      appointment: true,
      membership: { include: { plan: true } },
    },
  });
  if (!payment) throw new AppError("Payment not found", 404);
  return payment;
}

export async function createPayment(data) {
  if (Number(data.amount) < 0) {
    throw new AppError("Amount must be zero or greater", 400);
  }

  return prisma.payment.create({
    data: {
      patientId: data.patientId || null,
      appointmentId: data.appointmentId || null,
      membershipId: data.membershipId || null,
      amount: data.amount,
      currency: data.currency || env.payments.currency,
      method: data.method,
      status: data.status || "PENDING",
      gateway: data.gateway || "MANUAL",
      providerRef: sanitizeString(data.providerRef, { max: 120 }) || null,
      notes: sanitizeString(data.notes, { max: 2000 }) || null,
      paidAt: data.status === "PAID" ? new Date() : null,
      metadata: data.metadata || undefined,
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      appointment: { select: { id: true, date: true, status: true } },
    },
  });
}

export async function updatePayment(id, data) {
  const current = await getPayment(id);

  if (
    current.status === "PAID" &&
    data.status &&
    !["PAID", "REFUNDED"].includes(data.status)
  ) {
    throw new AppError("Paid payments can only remain PAID or become REFUNDED", 400);
  }

  return prisma.payment.update({
    where: { id },
    data: {
      ...(data.patientId !== undefined ? { patientId: data.patientId } : {}),
      ...(data.appointmentId !== undefined
        ? { appointmentId: data.appointmentId }
        : {}),
      ...(data.membershipId !== undefined
        ? { membershipId: data.membershipId }
        : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.method !== undefined ? { method: data.method } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.gateway !== undefined ? { gateway: data.gateway } : {}),
      ...(data.providerRef !== undefined
        ? { providerRef: sanitizeString(data.providerRef, { max: 120 }) }
        : {}),
      ...(data.notes !== undefined
        ? { notes: sanitizeString(data.notes, { max: 2000 }) }
        : {}),
      ...(data.status === "PAID" && !current.paidAt ? { paidAt: new Date() } : {}),
      ...(data.status === "REFUNDED" || data.status === "FAILED"
        ? {}
        : {}),
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      appointment: { select: { id: true, date: true, status: true } },
    },
  });
}

export async function deletePayment(id) {
  const payment = await getPayment(id);
  if (payment.status === "PAID") {
    throw new AppError("Cannot delete a paid payment. Mark it refunded instead.", 400);
  }
  await prisma.payment.delete({ where: { id } });
  return { message: "Payment deleted" };
}

export async function getFinanceStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    paidPayments,
    pendingPayments,
    refundedPayments,
    failedPayments,
    membershipPayments,
    paidAppointments,
    monthlyPaid,
    recentPayments,
  ] = await Promise.all([
    prisma.payment.findMany({ where: { status: "PAID" }, select: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: "REFUNDED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.findMany({
      where: { status: "PAID", OR: [{ method: "MEMBERSHIP" }, { membershipId: { not: null } }] },
      select: { amount: true },
    }),
    prisma.appointment.count({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        payment: { status: "PAID" },
      },
    }),
    prisma.payment.findMany({
      where: {
        status: "PAID",
        OR: [
          { paidAt: { gte: monthStart, lte: monthEnd } },
          { paidAt: null, createdAt: { gte: monthStart, lte: monthEnd } },
        ],
      },
      select: { amount: true, createdAt: true, paidAt: true },
    }),
    prisma.payment.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true } },
      },
    }),
  ]);

  const sum = (rows) => rows.reduce((total, row) => total + Number(row.amount), 0);

  return {
    totalRevenue: sum(paidPayments),
    pendingPaymentsAmount: Number(pendingPayments._sum.amount || 0),
    pendingPaymentsCount: pendingPayments._count,
    refundedAmount: Number(refundedPayments._sum.amount || 0),
    refundedCount: refundedPayments._count,
    failedPaymentsCount: failedPayments,
    membershipRevenue: sum(membershipPayments),
    paidAppointments,
    monthlyRevenue: sum(monthlyPaid),
    monthLabel: monthStart.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
    recentPayments,
  };
}
