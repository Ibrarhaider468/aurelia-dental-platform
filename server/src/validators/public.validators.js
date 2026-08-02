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
