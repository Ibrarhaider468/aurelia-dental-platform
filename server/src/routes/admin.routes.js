import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import {
  authenticate,
  requireOwnDoctorParam,
  requirePermission,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { PERMISSIONS } from "../constants/roles.js";
import {
  appointmentCreateSchema,
  appointmentUpdateSchema,
  availabilitySchema,
  doctorSchema,
  faqSchema,
  gallerySchema,
  checkoutSchema,
  contactStatusSchema,
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
  userCreateSchema,
  userUpdateSchema,
} from "../validators/admin.validators.js";
import { slotsQuerySchema } from "../validators/public.validators.js";

const router = Router();

const can = (...permissions) => [
  authenticate,
  requirePermission(...permissions),
];

router.get("/dashboard", ...can(PERMISSIONS.DASHBOARD), admin.getDashboard);

router.get("/doctors", ...can(PERMISSIONS.DOCTORS_READ), admin.listDoctors);
router.get("/doctors/:id", ...can(PERMISSIONS.DOCTORS_READ), admin.getDoctor);
router.post(
  "/doctors",
  ...can(PERMISSIONS.DOCTORS_MANAGE),
  validate(doctorSchema),
  admin.createDoctor,
);
router.put(
  "/doctors/:id",
  ...can(PERMISSIONS.DOCTORS_MANAGE),
  validate(doctorSchema.partial()),
  admin.updateDoctor,
);
router.delete(
  "/doctors/:id",
  ...can(PERMISSIONS.DOCTORS_MANAGE),
  admin.deleteDoctor,
);
router.put(
  "/doctors/:id/availability",
  authenticate,
  requirePermission(PERMISSIONS.DOCTORS_MANAGE, PERMISSIONS.AVAILABILITY_OWN),
  requireOwnDoctorParam("id"),
  validate(availabilitySchema),
  admin.upsertAvailability,
);
router.delete(
  "/doctors/:id/availability/:availabilityId",
  authenticate,
  requirePermission(PERMISSIONS.DOCTORS_MANAGE, PERMISSIONS.AVAILABILITY_OWN),
  requireOwnDoctorParam("id"),
  admin.deleteAvailability,
);
router.get(
  "/doctors/:id/leaves",
  authenticate,
  requirePermission(
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.AVAILABILITY_OWN,
    PERMISSIONS.DOCTORS_READ,
  ),
  requireOwnDoctorParam("id"),
  admin.listLeaves,
);
router.post(
  "/doctors/:id/leaves",
  authenticate,
  requirePermission(PERMISSIONS.SCHEDULE_MANAGE, PERMISSIONS.AVAILABILITY_OWN),
  requireOwnDoctorParam("id"),
  validate(leaveSchema),
  admin.createLeave,
);
router.delete(
  "/doctors/:id/leaves/:leaveId",
  authenticate,
  requirePermission(PERMISSIONS.SCHEDULE_MANAGE, PERMISSIONS.AVAILABILITY_OWN),
  requireOwnDoctorParam("id"),
  admin.deleteLeave,
);

router.get("/holidays", ...can(PERMISSIONS.SCHEDULE_READ), admin.listHolidays);
router.post(
  "/holidays",
  ...can(PERMISSIONS.SCHEDULE_MANAGE),
  validate(holidaySchema),
  admin.createHoliday,
);
router.delete(
  "/holidays/:id",
  ...can(PERMISSIONS.SCHEDULE_MANAGE),
  admin.deleteHoliday,
);
router.get("/leaves", ...can(PERMISSIONS.SCHEDULE_READ), admin.listLeaves);

router.get(
  "/slots",
  ...can(PERMISSIONS.SCHEDULE_READ, PERMISSIONS.APPOINTMENTS_READ),
  validate(slotsQuerySchema, "query"),
  admin.getAdminSlots,
);
router.get("/mail-status", ...can(PERMISSIONS.SETTINGS_MANAGE), admin.mailStatus);

router.get("/services", ...can(PERMISSIONS.SERVICES_READ), admin.listServices);
router.get("/services/:id", ...can(PERMISSIONS.SERVICES_READ), admin.getService);
router.post(
  "/services",
  ...can(PERMISSIONS.SERVICES_MANAGE),
  validate(serviceSchema),
  admin.createService,
);
router.put(
  "/services/:id",
  ...can(PERMISSIONS.SERVICES_MANAGE),
  validate(serviceSchema.partial()),
  admin.updateService,
);
router.delete(
  "/services/:id",
  ...can(PERMISSIONS.SERVICES_MANAGE),
  admin.deleteService,
);

router.get(
  "/appointments",
  ...can(PERMISSIONS.APPOINTMENTS_READ),
  admin.listAppointments,
);
router.get(
  "/appointments/export",
  ...can(PERMISSIONS.APPOINTMENTS_READ, PERMISSIONS.FINANCE_READ),
  admin.exportAppointments,
);
router.get(
  "/appointments/calendar",
  ...can(PERMISSIONS.SCHEDULE_READ, PERMISSIONS.APPOINTMENTS_READ),
  admin.getCalendar,
);
router.get(
  "/appointments/:id",
  ...can(PERMISSIONS.APPOINTMENTS_READ),
  admin.getAppointment,
);
router.post(
  "/appointments",
  ...can(PERMISSIONS.APPOINTMENTS_MANAGE),
  validate(appointmentCreateSchema),
  admin.createAppointment,
);
router.put(
  "/appointments/:id",
  ...can(PERMISSIONS.APPOINTMENTS_MANAGE),
  validate(appointmentUpdateSchema),
  admin.updateAppointment,
);
router.delete(
  "/appointments/:id",
  ...can(PERMISSIONS.APPOINTMENTS_MANAGE),
  admin.deleteAppointment,
);

router.get("/patients", ...can(PERMISSIONS.PATIENTS_READ), admin.listPatients);
router.get("/patients/:id", ...can(PERMISSIONS.PATIENTS_READ), admin.getPatient);
router.post(
  "/patients",
  ...can(PERMISSIONS.PATIENTS_MANAGE),
  validate(patientSchema),
  admin.createPatient,
);
router.put(
  "/patients/:id",
  ...can(PERMISSIONS.PATIENTS_MANAGE),
  validate(patientSchema.partial()),
  admin.updatePatient,
);
router.delete(
  "/patients/:id",
  ...can(PERMISSIONS.PATIENTS_MANAGE),
  admin.deletePatient,
);
router.post(
  "/patients/:id/notes",
  ...can(PERMISSIONS.PATIENTS_MANAGE, PERMISSIONS.APPOINTMENTS_MANAGE),
  validate(patientNoteSchema),
  admin.addPatientNote,
);

router.get("/payments", ...can(PERMISSIONS.PAYMENTS_READ), admin.listPayments);
router.get("/finance", ...can(PERMISSIONS.FINANCE_READ), admin.getFinance);
router.get(
  "/payments/gateway-config",
  ...can(PERMISSIONS.PAYMENTS_READ),
  admin.getGatewayConfig,
);
router.get("/payments/:id", ...can(PERMISSIONS.PAYMENTS_READ), admin.getPayment);
router.post(
  "/payments",
  ...can(PERMISSIONS.PAYMENTS_MANAGE),
  validate(paymentSchema),
  admin.createPayment,
);
router.post(
  "/payments/:id/checkout",
  ...can(PERMISSIONS.PAYMENTS_MANAGE),
  validate(checkoutSchema),
  admin.createCheckout,
);
router.put(
  "/payments/:id",
  ...can(PERMISSIONS.PAYMENTS_MANAGE),
  validate(paymentSchema.partial()),
  admin.updatePayment,
);
router.delete(
  "/payments/:id",
  ...can(PERMISSIONS.PAYMENTS_MANAGE),
  admin.deletePayment,
);

router.get(
  "/membership-plans",
  ...can(PERMISSIONS.MEMBERSHIPS_READ),
  admin.listMembershipPlans,
);
router.get(
  "/membership-plans/:id",
  ...can(PERMISSIONS.MEMBERSHIPS_READ),
  admin.getMembershipPlan,
);
router.post(
  "/membership-plans",
  ...can(PERMISSIONS.MEMBERSHIPS_MANAGE),
  validate(membershipPlanSchema),
  admin.createMembershipPlan,
);
router.put(
  "/membership-plans/:id",
  ...can(PERMISSIONS.MEMBERSHIPS_MANAGE),
  validate(membershipPlanSchema.partial()),
  admin.updateMembershipPlan,
);
router.delete(
  "/membership-plans/:id",
  ...can(PERMISSIONS.MEMBERSHIPS_MANAGE),
  admin.deleteMembershipPlan,
);
router.get(
  "/memberships",
  ...can(PERMISSIONS.MEMBERSHIPS_READ),
  admin.listSubscriptions,
);
router.post(
  "/memberships/subscribe",
  ...can(PERMISSIONS.MEMBERSHIPS_MANAGE),
  validate(membershipSubscribeSchema),
  admin.createSubscription,
);
router.put(
  "/memberships/:id/status",
  ...can(PERMISSIONS.MEMBERSHIPS_MANAGE),
  validate(subscriptionStatusSchema),
  admin.updateSubscription,
);

router.get("/insurance", ...can(PERMISSIONS.INSURANCE_READ), admin.listInsurance);
router.post(
  "/insurance",
  ...can(PERMISSIONS.INSURANCE_MANAGE),
  validate(insuranceSchema),
  admin.createInsurance,
);
router.put(
  "/insurance/:id",
  ...can(PERMISSIONS.INSURANCE_MANAGE),
  validate(insuranceSchema.partial()),
  admin.updateInsurance,
);
router.delete(
  "/insurance/:id",
  ...can(PERMISSIONS.INSURANCE_MANAGE),
  admin.deleteInsurance,
);
router.get(
  "/patient-insurance",
  ...can(PERMISSIONS.INSURANCE_READ),
  admin.listPatientInsurance,
);
router.post(
  "/patient-insurance",
  ...can(PERMISSIONS.INSURANCE_MANAGE),
  validate(patientInsuranceSchema),
  admin.createPatientInsurance,
);
router.put(
  "/patient-insurance/:id",
  ...can(PERMISSIONS.INSURANCE_MANAGE),
  validate(patientInsuranceSchema.partial()),
  admin.updatePatientInsurance,
);
router.delete(
  "/patient-insurance/:id",
  ...can(PERMISSIONS.INSURANCE_MANAGE),
  admin.deletePatientInsurance,
);

router.get("/gallery", ...can(PERMISSIONS.CMS_MANAGE), admin.listGallery);
router.post(
  "/gallery",
  ...can(PERMISSIONS.CMS_MANAGE),
  validate(gallerySchema),
  admin.createGallery,
);
router.put(
  "/gallery/:id",
  ...can(PERMISSIONS.CMS_MANAGE),
  validate(gallerySchema.partial()),
  admin.updateGallery,
);
router.delete("/gallery/:id", ...can(PERMISSIONS.CMS_MANAGE), admin.deleteGallery);

router.get(
  "/testimonials",
  ...can(PERMISSIONS.CMS_MANAGE),
  admin.listTestimonials,
);
router.post(
  "/testimonials",
  ...can(PERMISSIONS.CMS_MANAGE),
  validate(testimonialSchema),
  admin.createTestimonial,
);
router.put(
  "/testimonials/:id",
  ...can(PERMISSIONS.CMS_MANAGE),
  validate(testimonialSchema.partial()),
  admin.updateTestimonial,
);
router.delete(
  "/testimonials/:id",
  ...can(PERMISSIONS.CMS_MANAGE),
  admin.deleteTestimonial,
);

router.get("/settings", ...can(PERMISSIONS.SETTINGS_READ, PERMISSIONS.CMS_MANAGE), admin.getSettings);
router.put(
  "/settings",
  ...can(PERMISSIONS.SETTINGS_MANAGE),
  validate(settingsSchema),
  admin.updateSettings,
);

router.get("/faqs", ...can(PERMISSIONS.CMS_MANAGE), admin.listFaqs);
router.post(
  "/faqs",
  ...can(PERMISSIONS.CMS_MANAGE),
  validate(faqSchema),
  admin.createFaq,
);
router.put(
  "/faqs/:id",
  ...can(PERMISSIONS.CMS_MANAGE),
  validate(faqSchema.partial()),
  admin.updateFaq,
);
router.delete("/faqs/:id", ...can(PERMISSIONS.CMS_MANAGE), admin.deleteFaq);

router.get(
  "/contact-messages",
  ...can(PERMISSIONS.CONTACT_MANAGE),
  admin.listContactMessages,
);
router.get(
  "/contact-messages/:id",
  ...can(PERMISSIONS.CONTACT_MANAGE),
  admin.getContactMessage,
);
router.put(
  "/contact-messages/:id/status",
  ...can(PERMISSIONS.CONTACT_MANAGE),
  validate(contactStatusSchema),
  admin.updateContactMessageStatus,
);
router.delete(
  "/contact-messages/:id",
  ...can(PERMISSIONS.CONTACT_MANAGE),
  admin.deleteContactMessage,
);

router.get("/users", ...can(PERMISSIONS.USERS_MANAGE), admin.listUsers);
router.get("/users/:id", ...can(PERMISSIONS.USERS_MANAGE), admin.getUser);
router.post(
  "/users",
  ...can(PERMISSIONS.USERS_MANAGE),
  validate(userCreateSchema),
  admin.createUser,
);
router.put(
  "/users/:id",
  ...can(PERMISSIONS.USERS_MANAGE),
  validate(userUpdateSchema),
  admin.updateUser,
);
router.delete("/users/:id", ...can(PERMISSIONS.USERS_MANAGE), admin.deleteUser);

export default router;
