import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { notifyBookingReceived } from "./email.service.js";
import { getGatewayConfig } from "./paymentGateway.service.js";
import { assertSlotBookable, getAvailableSlots } from "./slot.service.js";
import {
  sanitizeEmail,
  sanitizePhone,
  sanitizeString,
  toDateOnlyUTC,
} from "../utils/sanitize.js";
import {
  getTreatmentPresentation,
  relatedDoctorsForService,
} from "../utils/treatmentContent.js";
import { slugify } from "../utils/slug.js";

const METHOD_LABELS = {
  PRIVATE: "Private payment",
  INSURANCE: "Insurance",
  CREDIT_CARD: "Credit card",
  DEBIT_CARD: "Debit card",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  BANK_TRANSFER: "Bank transfer",
  FINANCE_PLAN: "Finance plans",
  MEMBERSHIP: "Membership billing",
};

let websiteCache = null;
let websiteCacheAt = 0;
const WEBSITE_CACHE_TTL_MS = env.isDev ? 0 : 20_000;

export function invalidateWebsiteCache() {
  websiteCache = null;
  websiteCacheAt = 0;
}

export async function getWebsiteData() {
  if (
    WEBSITE_CACHE_TTL_MS > 0 &&
    websiteCache &&
    Date.now() - websiteCacheAt < WEBSITE_CACHE_TTL_MS
  ) {
    return websiteCache;
  }

  const [
    settings,
    services,
    doctors,
    gallery,
    testimonials,
    insurance,
    memberships,
    faqs,
  ] = await Promise.all([
    prisma.settings.upsert({
      where: { id: "clinic" },
      update: {},
      create: { id: "clinic", clinicName: "Aurelia Dental" },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        availabilities: {
          where: { isActive: true },
          orderBy: { day: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.gallery.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.testimonial.findMany({
      where: { isApproved: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.insuranceProvider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    }),
    prisma.faq.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const paymentConfig = getGatewayConfig();
  const paymentOptions = {
    ...paymentConfig,
    methods: paymentConfig.supportedMethods.map((method) => ({
      code: method,
      label: METHOD_LABELS[method] || method,
    })),
  };

  const payload = {
    settings,
    services,
    doctors,
    gallery,
    testimonials,
    insurance,
    memberships,
    faqs,
    paymentOptions,
  };

  if (WEBSITE_CACHE_TTL_MS > 0) {
    websiteCache = payload;
    websiteCacheAt = Date.now();
  }

  return payload;
}

export async function listPublicServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

export async function listPublicDoctors() {
  return prisma.doctor.findMany({
    where: { isActive: true },
    include: {
      availabilities: {
        where: { isActive: true },
        orderBy: { day: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPublicServiceBySlug(slug) {
  const service = await prisma.service.findFirst({
    where: { slug, isActive: true },
  });
  if (!service) throw new AppError("Treatment not found", 404);

  const doctors = await listPublicDoctors();
  const presentation = getTreatmentPresentation(service);

  return {
    service,
    ...presentation,
    relatedDoctors: relatedDoctorsForService(service, doctors),
  };
}

export async function getPublicDoctorBySlug(slug) {
  const doctors = await listPublicDoctors();
  const doctor = doctors.find((d) => slugify(d.name) === slug) || null;
  if (!doctor) throw new AppError("Dentist not found", 404);
  return doctor;
}

export function publicDoctorPath(doctor) {
  return `/dentists/${slugify(doctor.name)}`;
}

export async function getDoctorAvailabilityDays(doctorId) {
  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, isActive: true },
    include: {
      availabilities: { where: { isActive: true } },
    },
  });
  if (!doctor) throw new AppError("Doctor not found", 404);
  return {
    doctor: {
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
    },
    days: doctor.availabilities.map((a) => a.day),
  };
}

export { getAvailableSlots };

export async function createPublicBooking(data) {
  const patientName = sanitizeString(data.patientName, { max: 120 });
  const email = sanitizeEmail(data.email);
  const phone = sanitizePhone(data.phone);
  const message = sanitizeString(data.message, { max: 2000 }) || null;

  const [doctor, service] = await Promise.all([
    prisma.doctor.findFirst({ where: { id: data.doctorId, isActive: true } }),
    prisma.service.findFirst({ where: { id: data.serviceId, isActive: true } }),
  ]);

  if (!doctor) throw new AppError("Doctor not found", 404);
  if (!service) throw new AppError("Service not found", 404);

  await assertSlotBookable({
    doctorId: data.doctorId,
    date: data.date,
    slot: data.slot,
  });

  const appointment = await prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        date: toDateOnlyUTC(data.date),
        slot: data.slot,
        status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] },
      },
    });
    if (conflict) {
      throw new AppError("This time slot was just booked. Please choose another.", 409);
    }

    let patient = await tx.patient.findUnique({ where: { email } });
    if (!patient) {
      patient = await tx.patient.create({
        data: { name: patientName, email, phone },
      });
    } else {
      patient = await tx.patient.update({
        where: { id: patient.id },
        data: { name: patientName, phone },
      });
    }

    return tx.appointment.create({
      data: {
        patientId: patient.id,
        patientName,
        email,
        phone,
        doctorId: data.doctorId,
        serviceId: data.serviceId,
        date: toDateOnlyUTC(data.date),
        slot: data.slot,
        message,
        status: "PENDING",
      },
      include: {
        doctor: { select: { id: true, name: true } },
        service: { select: { id: true, title: true, duration: true, price: true } },
      },
    });
  });

  const emailResult = await notifyBookingReceived(appointment);

  return {
    appointment,
    confirmation: emailResult.patient?.preview || null,
    email: {
      patientDelivered: emailResult.patient?.delivered ?? false,
      adminDelivered: emailResult.admin?.delivered ?? false,
      mode: emailResult.patient?.mode || "log",
    },
  };
}
