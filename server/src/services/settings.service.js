import { prisma } from "../config/db.js";
import { invalidateWebsiteCache } from "./public.service.js";
import { resetMailTransport } from "./email.service.js";

const PASSWORD_PLACEHOLDER = "********";

function sanitizeSettingsForClient(settings) {
  if (!settings) return settings;
  const { smtpPass, ...rest } = settings;
  return {
    ...rest,
    smtpPass: smtpPass ? PASSWORD_PLACEHOLDER : "",
    smtpConfigured: Boolean(settings.smtpHost && settings.smtpUser && smtpPass),
  };
}

export async function getSettings() {
  const settings = await prisma.settings.upsert({
    where: { id: "clinic" },
    update: {},
    create: {
      id: "clinic",
      clinicName: "Aurelia Dental",
    },
  });
  return sanitizeSettingsForClient(settings);
}

export async function updateSettings(data) {
  const current = await prisma.settings.findUnique({ where: { id: "clinic" } });

  const payload = { ...data };
  if (
    payload.smtpPass === undefined ||
    payload.smtpPass === null ||
    payload.smtpPass === "" ||
    payload.smtpPass === PASSWORD_PLACEHOLDER
  ) {
    delete payload.smtpPass;
  }

  if (payload.smtpPort !== undefined && payload.smtpPort !== null && payload.smtpPort !== "") {
    payload.smtpPort = Number(payload.smtpPort);
  }

  const settings = await prisma.settings.upsert({
    where: { id: "clinic" },
    update: payload,
    create: {
      id: "clinic",
      clinicName: payload.clinicName || current?.clinicName || "Aurelia Dental",
      ...payload,
    },
  });

  invalidateWebsiteCache();
  resetMailTransport();
  return sanitizeSettingsForClient(settings);
}

export async function listFaqs() {
  return prisma.faq.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createFaq(data) {
  return prisma.faq.create({
    data: {
      question: data.question,
      answer: data.answer,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateFaq(id, data) {
  return prisma.faq.update({
    where: { id },
    data,
  });
}

export async function deleteFaq(id) {
  await prisma.faq.delete({ where: { id } });
  return { message: "FAQ deleted" };
}
