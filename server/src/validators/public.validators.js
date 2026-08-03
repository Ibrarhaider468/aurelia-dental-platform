import { z } from "zod";

export const slotsQuerySchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const bookingSchema = z.object({
  patientName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Phone is required"),
  serviceId: z.string().min(1, "Service is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  slot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time slot"),
  message: z.string().optional().nullable(),
});

export const contactMessageSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Phone is required").max(40),
  subject: z.string().min(2, "Subject is required").max(160),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});
