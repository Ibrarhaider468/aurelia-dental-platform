import { z } from "zod";
import { dayOfWeekSchema, timeSchema } from "./common.validators.js";

export const doctorSchema = z.object({
  name: z.string().min(2),
  image: z.string().url().optional().nullable().or(z.literal("")),
  qualification: z.string().optional().nullable(),
  experience: z.coerce.number().int().min(0).optional().nullable(),
  specialization: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  userId: z.string().optional().nullable(),
});

export const availabilitySchema = z.object({
  day: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  breakStart: timeSchema.optional().nullable().or(z.literal("")),
  breakEnd: timeSchema.optional().nullable().or(z.literal("")),
  slotMinutes: z.coerce.number().int().min(5).max(240).default(30),
  isActive: z.boolean().optional(),
});

export const serviceSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().min(5),
  image: z.string().url().optional().nullable().or(z.literal("")),
  duration: z.coerce.number().int().min(5),
  price: z.coerce.number().min(0),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const appointmentUpdateSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED"])
    .optional(),
  doctorId: z.string().optional(),
  serviceId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  message: z.string().max(2000).optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
  rescheduleReason: z.string().max(500).optional().nullable(),
  patientName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
});

export const appointmentCreateSchema = z.object({
  patientName: z.string().min(2).max(120),
  email: z.string().email().max(254),
  phone: z.string().min(7).max(40),
  doctorId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  message: z.string().max(2000).optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
  status: z
    .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED"])
    .optional(),
  patientId: z.string().optional().nullable(),
});

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2).max(120),
});

export const leaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional().nullable(),
});

export const patientNoteSchema = z.object({
  note: z.string().min(2).max(5000),
});

export const patientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  medicalNotes: z.string().optional().nullable(),
});

export const paymentSchema = z.object({
  patientId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  membershipId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0),
  currency: z.string().length(3).optional(),
  method: z.enum([
    "PRIVATE",
    "INSURANCE",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "APPLE_PAY",
    "GOOGLE_PAY",
    "BANK_TRANSFER",
    "FINANCE_PLAN",
    "MEMBERSHIP",
  ]),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  gateway: z
    .enum(["MANUAL", "STRIPE", "PAYPAL", "CARD", "APPLE_PAY", "GOOGLE_PAY"])
    .optional(),
  providerRef: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const checkoutSchema = z.object({
  gateway: z.enum(["STRIPE", "PAYPAL", "CARD", "APPLE_PAY", "GOOGLE_PAY"]),
  customerEmail: z.string().email().optional(),
  description: z.string().max(500).optional(),
});

export const membershipPlanSchema = z.object({
  name: z.string().min(2).max(120),
  price: z.coerce.number().min(0),
  billingCycle: z.string().default("monthly"),
  durationMonths: z.coerce.number().int().min(1).max(60).default(1),
  benefits: z.array(z.string()).default([]),
  includedTreatments: z.array(z.string()).default([]),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const membershipSubscribeSchema = z.object({
  planId: z.string().min(1),
  patientId: z.string().optional(),
  patientName: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(40).optional(),
  gateway: z
    .enum(["MANUAL", "STRIPE", "PAYPAL", "CARD", "APPLE_PAY", "GOOGLE_PAY"])
    .optional(),
}).refine(
  (value) => value.patientId || (value.patientName && value.email && value.phone),
  { message: "Provide patientId or patientName, email, and phone" },
);

export const subscriptionStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "CANCELLED", "EXPIRED"]),
});

export const insuranceSchema = z.object({
  name: z.string().min(2),
  details: z.string().min(5),
  acceptedPlans: z.array(z.string()).default([]),
  logo: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const patientInsuranceSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().min(1),
  policyNumber: z.string().min(2).max(80),
  groupNumber: z.string().max(80).optional().nullable(),
  holderName: z.string().max(120).optional().nullable(),
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "EXPIRED"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const gallerySchema = z.object({
  beforeImage: z.string().url(),
  afterImage: z.string().url(),
  treatment: z.string().min(2),
  caption: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const testimonialSchema = z.object({
  patientName: z.string().min(2),
  review: z.string().min(5),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  isApproved: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const settingsSchema = z.object({
  clinicName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  openingHours: z.record(z.string(), z.string()).optional().nullable(),
  logo: z.string().optional().nullable(),
  socialLinks: z.record(z.string(), z.string()).optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  heroTitle: z.string().optional().nullable(),
  heroSubtitle: z.string().optional().nullable(),
  aboutContent: z.string().optional().nullable(),
  mapEmbedUrl: z.string().optional().nullable(),
  whatsappNumber: z
    .string()
    .max(40)
    .regex(/^[+\d\s()-]*$/, "Use digits and optional + ( ) - spaces only")
    .optional()
    .nullable()
    .or(z.literal("")),
  smtpHost: z.string().max(200).optional().nullable().or(z.literal("")),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  smtpUser: z.string().max(200).optional().nullable().or(z.literal("")),
  smtpPass: z.string().max(500).optional().nullable().or(z.literal("")),
  mailFrom: z.string().max(200).optional().nullable().or(z.literal("")),
});

export const faqSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(5),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const contactStatusSchema = z.object({
  status: z.enum(["NEW", "READ", "REPLIED"]),
});

const permissionValueSchema = z.string().min(3).max(64);

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
  role: z.enum(["SUPER_ADMIN", "STAFF", "FINANCE_MANAGER", "DOCTOR"]),
  isActive: z.boolean().optional(),
  doctorId: z.string().min(1).optional().nullable(),
  /** Empty array = use role defaults. Non-empty = custom access override. */
  customPermissions: z.array(permissionValueSchema).optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .optional(),
  role: z.enum(["SUPER_ADMIN", "STAFF", "FINANCE_MANAGER", "DOCTOR"]).optional(),
  isActive: z.boolean().optional(),
  doctorId: z.string().min(1).optional().nullable(),
  customPermissions: z.array(permissionValueSchema).optional(),
});
