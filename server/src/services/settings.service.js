import { prisma } from "../config/db.js";
import { invalidateWebsiteCache } from "./public.service.js";

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "clinic" },
    update: {},
    create: {
      id: "clinic",
      clinicName: "Aurelia Dental",
    },
  });
}

export async function updateSettings(data) {
  const settings = await prisma.settings.upsert({
    where: { id: "clinic" },
    update: data,
    create: {
      id: "clinic",
      clinicName: data.clinicName || "Aurelia Dental",
      ...data,
    },
  });
  invalidateWebsiteCache();
  return settings;
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
