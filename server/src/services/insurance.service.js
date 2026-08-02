import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { sanitizeString } from "../utils/sanitize.js";

function normalizeEmpty(value) {
  if (value === "" || value === undefined) return null;
  return value;
}

export async function listProviders() {
  return prisma.insuranceProvider.findMany({
    include: { _count: { select: { patientPlans: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getProvider(id) {
  const provider = await prisma.insuranceProvider.findUnique({
    where: { id },
    include: {
      patientPlans: {
        include: { patient: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!provider) throw new AppError("Insurance provider not found", 404);
  return provider;
}

export async function createProvider(data) {
  return prisma.insuranceProvider.create({
    data: {
      name: sanitizeString(data.name, { max: 120 }),
      details: sanitizeString(data.details, { max: 5000 }),
      acceptedPlans: data.acceptedPlans || [],
      logo: normalizeEmpty(data.logo),
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateProvider(id, data) {
  await getProvider(id);
  return prisma.insuranceProvider.update({
    where: { id },
    data: {
      ...(data.name !== undefined
        ? { name: sanitizeString(data.name, { max: 120 }) }
        : {}),
      ...(data.details !== undefined
        ? { details: sanitizeString(data.details, { max: 5000 }) }
        : {}),
      ...(data.acceptedPlans !== undefined
        ? { acceptedPlans: data.acceptedPlans }
        : {}),
      ...(data.logo !== undefined ? { logo: normalizeEmpty(data.logo) } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteProvider(id) {
  await getProvider(id);
  const linked = await prisma.patientInsurance.count({ where: { providerId: id } });
  if (linked > 0) {
    throw new AppError(
      "Cannot delete provider with patient insurance records. Deactivate it instead.",
      400,
    );
  }
  await prisma.insuranceProvider.delete({ where: { id } });
  return { message: "Insurance provider deleted" };
}

export async function listPatientInsurance({ patientId, status } = {}) {
  return prisma.patientInsurance.findMany({
    where: {
      ...(patientId ? { patientId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true } },
      provider: { select: { id: true, name: true, acceptedPlans: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPatientInsurance(data) {
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new AppError("Patient not found", 404);

  const provider = await prisma.insuranceProvider.findUnique({
    where: { id: data.providerId },
  });
  if (!provider || !provider.isActive) {
    throw new AppError("Insurance provider not available", 404);
  }

  return prisma.patientInsurance.create({
    data: {
      patientId: data.patientId,
      providerId: data.providerId,
      policyNumber: sanitizeString(data.policyNumber, { max: 80 }),
      groupNumber: sanitizeString(data.groupNumber, { max: 80 }) || null,
      holderName: sanitizeString(data.holderName, { max: 120 }) || null,
      status: data.status || "PENDING",
      notes: sanitizeString(data.notes, { max: 2000 }) || null,
      verifiedAt: data.status === "VERIFIED" ? new Date() : null,
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      provider: { select: { id: true, name: true } },
    },
  });
}

export async function updatePatientInsurance(id, data) {
  const current = await prisma.patientInsurance.findUnique({ where: { id } });
  if (!current) throw new AppError("Patient insurance record not found", 404);

  return prisma.patientInsurance.update({
    where: { id },
    data: {
      ...(data.providerId !== undefined ? { providerId: data.providerId } : {}),
      ...(data.policyNumber !== undefined
        ? { policyNumber: sanitizeString(data.policyNumber, { max: 80 }) }
        : {}),
      ...(data.groupNumber !== undefined
        ? { groupNumber: sanitizeString(data.groupNumber, { max: 80 }) }
        : {}),
      ...(data.holderName !== undefined
        ? { holderName: sanitizeString(data.holderName, { max: 120 }) }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined
        ? { notes: sanitizeString(data.notes, { max: 2000 }) }
        : {}),
      ...(data.status === "VERIFIED" ? { verifiedAt: new Date() } : {}),
      ...(data.status && data.status !== "VERIFIED" ? { verifiedAt: null } : {}),
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      provider: { select: { id: true, name: true } },
    },
  });
}

export async function deletePatientInsurance(id) {
  const current = await prisma.patientInsurance.findUnique({ where: { id } });
  if (!current) throw new AppError("Patient insurance record not found", 404);
  await prisma.patientInsurance.delete({ where: { id } });
  return { message: "Patient insurance deleted" };
}
