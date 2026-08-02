import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  appointmentCreateSchema,
  appointmentUpdateSchema,
  availabilitySchema,
  doctorSchema,
  faqSchema,
  gallerySchema,
  checkoutSchema,
  holidaySchema,
  insuranceSchema,
  leaveSchema,
  membershipPlanSchema,
  membershipSubscribeSchema,
  patientInsuranceSchema,
  patientNoteSchema,
  patientSchema,
  paymentSchema,
  subscriptionStatusSchema,
  serviceSchema,
  settingsSchema,
  testimonialSchema,
} from "../validators/admin.validators.js";
import { slotsQuerySchema } from "../validators/public.validators.js";

const router = Router();
const staff = [authenticate, authorize("ADMIN", "STAFF", "DOCTOR")];
const manage = [authenticate, authorize("ADMIN", "STAFF")];
const adminOnly = [authenticate, authorize("ADMIN")];

router.get("/dashboard", ...staff, admin.getDashboard);

router.get("/doctors", ...staff, admin.listDoctors);
router.get("/doctors/:id", ...staff, admin.getDoctor);
router.post("/doctors", ...manage, validate(doctorSchema), admin.createDoctor);
router.put("/doctors/:id", ...manage, validate(doctorSchema.partial()), admin.updateDoctor);
router.delete("/doctors/:id", ...adminOnly, admin.deleteDoctor);
router.put(
  "/doctors/:id/availability",
  ...manage,
  validate(availabilitySchema),
  admin.upsertAvailability,
);
router.delete(
  "/doctors/:id/availability/:availabilityId",
  ...manage,
  admin.deleteAvailability,
);
router.get("/doctors/:id/leaves", ...staff, admin.listLeaves);
router.post(
  "/doctors/:id/leaves",
  ...manage,
  validate(leaveSchema),
  admin.createLeave,
);
router.delete("/doctors/:id/leaves/:leaveId", ...manage, admin.deleteLeave);

router.get("/holidays", ...staff, admin.listHolidays);
router.post("/holidays", ...manage, validate(holidaySchema), admin.createHoliday);
router.delete("/holidays/:id", ...adminOnly, admin.deleteHoliday);
router.get("/leaves", ...staff, admin.listLeaves);

router.get("/slots", ...staff, validate(slotsQuerySchema, "query"), admin.getAdminSlots);
router.get("/mail-status", ...adminOnly, admin.mailStatus);

router.get("/services", ...staff, admin.listServices);
router.get("/services/:id", ...staff, admin.getService);
router.post("/services", ...manage, validate(serviceSchema), admin.createService);
router.put("/services/:id", ...manage, validate(serviceSchema.partial()), admin.updateService);
router.delete("/services/:id", ...adminOnly, admin.deleteService);

router.get("/appointments", ...staff, admin.listAppointments);
router.get("/appointments/export", ...staff, admin.exportAppointments);
router.get("/appointments/calendar", ...staff, admin.getCalendar);
router.get("/appointments/:id", ...staff, admin.getAppointment);
router.post(
  "/appointments",
  ...manage,
  validate(appointmentCreateSchema),
  admin.createAppointment,
);
router.put(
  "/appointments/:id",
  ...manage,
  validate(appointmentUpdateSchema),
  admin.updateAppointment,
);
router.delete("/appointments/:id", ...adminOnly, admin.deleteAppointment);

router.get("/patients", ...staff, admin.listPatients);
router.get("/patients/:id", ...staff, admin.getPatient);
router.post("/patients", ...manage, validate(patientSchema), admin.createPatient);
router.put("/patients/:id", ...manage, validate(patientSchema.partial()), admin.updatePatient);
router.delete("/patients/:id", ...adminOnly, admin.deletePatient);
router.post(
  "/patients/:id/notes",
  ...manage,
  validate(patientNoteSchema),
  admin.addPatientNote,
);

router.get("/payments", ...staff, admin.listPayments);
router.get("/finance", ...staff, admin.getFinance);
router.get("/payments/gateway-config", ...staff, admin.getGatewayConfig);
router.get("/payments/:id", ...staff, admin.getPayment);
router.post("/payments", ...manage, validate(paymentSchema), admin.createPayment);
router.post(
  "/payments/:id/checkout",
  ...manage,
  validate(checkoutSchema),
  admin.createCheckout,
);
router.put("/payments/:id", ...manage, validate(paymentSchema.partial()), admin.updatePayment);
router.delete("/payments/:id", ...adminOnly, admin.deletePayment);

router.get("/membership-plans", ...staff, admin.listMembershipPlans);
router.get("/membership-plans/:id", ...staff, admin.getMembershipPlan);
router.post(
  "/membership-plans",
  ...manage,
  validate(membershipPlanSchema),
  admin.createMembershipPlan,
);
router.put(
  "/membership-plans/:id",
  ...manage,
  validate(membershipPlanSchema.partial()),
  admin.updateMembershipPlan,
);
router.delete("/membership-plans/:id", ...adminOnly, admin.deleteMembershipPlan);
router.get("/memberships", ...staff, admin.listSubscriptions);
router.post(
  "/memberships/subscribe",
  ...manage,
  validate(membershipSubscribeSchema),
  admin.createSubscription,
);
router.put(
  "/memberships/:id/status",
  ...manage,
  validate(subscriptionStatusSchema),
  admin.updateSubscription,
);

router.get("/insurance", ...staff, admin.listInsurance);
router.post("/insurance", ...manage, validate(insuranceSchema), admin.createInsurance);
router.put(
  "/insurance/:id",
  ...manage,
  validate(insuranceSchema.partial()),
  admin.updateInsurance,
);
router.delete("/insurance/:id", ...adminOnly, admin.deleteInsurance);
router.get("/patient-insurance", ...staff, admin.listPatientInsurance);
router.post(
  "/patient-insurance",
  ...manage,
  validate(patientInsuranceSchema),
  admin.createPatientInsurance,
);
router.put(
  "/patient-insurance/:id",
  ...manage,
  validate(patientInsuranceSchema.partial()),
  admin.updatePatientInsurance,
);
router.delete("/patient-insurance/:id", ...adminOnly, admin.deletePatientInsurance);

router.get("/gallery", ...staff, admin.listGallery);
router.post("/gallery", ...manage, validate(gallerySchema), admin.createGallery);
router.put("/gallery/:id", ...manage, validate(gallerySchema.partial()), admin.updateGallery);
router.delete("/gallery/:id", ...adminOnly, admin.deleteGallery);

router.get("/testimonials", ...staff, admin.listTestimonials);
router.post(
  "/testimonials",
  ...manage,
  validate(testimonialSchema),
  admin.createTestimonial,
);
router.put(
  "/testimonials/:id",
  ...manage,
  validate(testimonialSchema.partial()),
  admin.updateTestimonial,
);
router.delete("/testimonials/:id", ...adminOnly, admin.deleteTestimonial);

router.get("/settings", ...staff, admin.getSettings);
router.put("/settings", ...adminOnly, validate(settingsSchema), admin.updateSettings);

router.get("/faqs", ...staff, admin.listFaqs);
router.post("/faqs", ...manage, validate(faqSchema), admin.createFaq);
router.put("/faqs/:id", ...manage, validate(faqSchema.partial()), admin.updateFaq);
router.delete("/faqs/:id", ...adminOnly, admin.deleteFaq);

export default router;
