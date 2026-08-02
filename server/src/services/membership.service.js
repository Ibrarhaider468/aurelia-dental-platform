import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { sanitizeEmail, sanitizePhone, sanitizeString } from "../utils/sanitize.js";
import * as paymentService from "./payment.service.js";

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function listPlans({ activeOnly = false } = {}) {
  return prisma.membershipPlan.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { subscriptions: true } } },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
}

export async function getPlan(id) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id },
    include: {
      subscriptions: {
        include: { patient: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!plan) throw new AppError("Membership plan not found", 404);
  return plan;
}

export async function createPlan(data) {
  return prisma.membershipPlan.create({
    data: {
      name: sanitizeString(data.name, { max: 120 }),
      price: data.price,
      billingCycle: data.billingCycle || "monthly",
      durationMonths: data.durationMonths || 1,
      benefits: data.benefits || [],
      includedTreatments: data.includedTreatments || [],
      description: sanitizeString(data.description, { max: 2000 }) || null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updatePlan(id, data) {
  await getPlan(id);
  return prisma.membershipPlan.update({
    where: { id },
    data: {
      ...(data.name !== undefined
        ? { name: sanitizeString(data.name, { max: 120 }) }
        : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.billingCycle !== undefined
        ? { billingCycle: data.billingCycle }
        : {}),
      ...(data.durationMonths !== undefined
        ? { durationMonths: data.durationMonths }
        : {}),
      ...(data.benefits !== undefined ? { benefits: data.benefits } : {}),
      ...(data.includedTreatments !== undefined
        ? { includedTreatments: data.includedTreatments }
        : {}),
      ...(data.description !== undefined
        ? { description: sanitizeString(data.description, { max: 2000 }) }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deletePlan(id) {
  await getPlan(id);
  const active = await prisma.patientMembership.count({
    where: { planId: id, status: "ACTIVE" },
  });
  if (active > 0) {
    throw new AppError("Cannot delete plan with active subscriptions", 400);
  }
  await prisma.membershipPlan.delete({ where: { id } });
  return { message: "Membership plan deleted" };
}

export async function listSubscriptions({ status, patientId } = {}) {
  return prisma.patientMembership.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
    },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      plan: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function resolvePatient({
  patientId,
  patientName,
  email,
  phone,
}) {
  if (patientId) {
    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!existing) throw new AppError("Patient not found", 404);
    return existing;
  }

  const normalizedEmail = sanitizeEmail(email);
  let patient = await prisma.patient.findUnique({
    where: { email: normalizedEmail },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: sanitizeString(patientName, { max: 120 }),
        email: normalizedEmail,
        phone: sanitizePhone(phone),
      },
    });
  }

  return patient;
}

export async function subscribeToPlan(data) {
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: data.planId, isActive: true },
  });
  if (!plan) throw new AppError("Membership plan not available", 404);

  const patient = await resolvePatient(data);

  const active = await prisma.patientMembership.findFirst({
    where: { patientId: patient.id, status: "ACTIVE" },
  });
  if (active) {
    throw new AppError("Patient already has an active membership", 409);
  }

  const startDate = new Date();
  const endDate = addMonths(startDate, plan.durationMonths || 1);

  const subscription = await prisma.patientMembership.create({
    data: {
      patientId: patient.id,
      planId: plan.id,
      status: "PENDING",
      startDate,
      endDate,
    },
    include: {
      plan: true,
      patient: { select: { id: true, name: true, email: true } },
    },
  });

  const payment = await paymentService.createPayment({
    patientId: patient.id,
    membershipId: subscription.id,
    amount: plan.price,
    method: "MEMBERSHIP",
    gateway: data.gateway || "MANUAL",
    status: "PENDING",
    notes: `Membership subscription: ${plan.name}`,
  });

  return { subscription, payment };
}

export async function updateSubscriptionStatus(id, status) {
  const subscription = await prisma.patientMembership.findUnique({
    where: { id },
    include: { plan: true, patient: true },
  });
  if (!subscription) throw new AppError("Subscription not found", 404);

  return prisma.patientMembership.update({
    where: { id },
    data: {
      status,
      ...(status === "ACTIVE" && !subscription.startDate
        ? {
            startDate: new Date(),
            endDate: addMonths(new Date(), subscription.plan.durationMonths || 1),
          }
        : {}),
    },
    include: {
      plan: true,
      patient: { select: { id: true, name: true, email: true } },
    },
  });
}
