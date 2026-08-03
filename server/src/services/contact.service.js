import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import {
  sanitizeEmail,
  sanitizePhone,
  sanitizeString,
} from "../utils/sanitize.js";
import { notifyContactReceived } from "./email.service.js";

export async function createContactMessage(data) {
  const message = await prisma.contactMessage.create({
    data: {
      name: sanitizeString(data.name, { max: 120 }),
      email: sanitizeEmail(data.email),
      phone: sanitizePhone(data.phone),
      subject: sanitizeString(data.subject, { max: 160 }),
      message: sanitizeString(data.message, { max: 5000 }),
      status: "NEW",
    },
  });

  try {
    await notifyContactReceived(message);
  } catch (error) {
    console.warn("[contact-email]", error.message);
  }

  return message;
}

export async function listContactMessages({ status, search } = {}) {
  return prisma.contactMessage.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { subject: { contains: search, mode: "insensitive" } },
              { message: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContactMessage(id) {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw new AppError("Contact message not found", 404);
  return message;
}

export async function updateContactMessageStatus(id, status) {
  await getContactMessage(id);
  return prisma.contactMessage.update({
    where: { id },
    data: { status },
  });
}

export async function deleteContactMessage(id) {
  await getContactMessage(id);
  await prisma.contactMessage.delete({ where: { id } });
  return { message: "Contact message deleted" };
}
