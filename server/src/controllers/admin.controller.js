import { asyncHandler } from "../utils/asyncHandler.js";
import * as dashboardService from "../services/dashboard.service.js";
import * as doctorService from "../services/doctor.service.js";
import * as serviceService from "../services/service.service.js";
import * as appointmentService from "../services/appointment.service.js";
import * as patientService from "../services/patient.service.js";
import * as paymentService from "../services/payment.service.js";
import * as membershipService from "../services/membership.service.js";
import * as insuranceService from "../services/insurance.service.js";
import * as galleryService from "../services/gallery.service.js";
import * as testimonialService from "../services/testimonial.service.js";
import * as settingsService from "../services/settings.service.js";
import * as scheduleService from "../services/schedule.service.js";
import * as slotService from "../services/slot.service.js";
import * as paymentGatewayService from "../services/paymentGateway.service.js";
import * as contactService from "../services/contact.service.js";
import * as userService from "../services/user.service.js";
import { getMailStatus } from "../services/email.service.js";
import {
  assertNotOtherDoctorRecord,
  isDoctor,
  requireLinkedDoctor,
  scopedDoctorId,
} from "../utils/rbac.js";
import { hasPermission, PERMISSIONS } from "../constants/roles.js";
import { AppError } from "../utils/AppError.js";

const ok = (res, data, message = "OK", status = 200) =>
  res.status(status).json({ success: true, message, data });

export const getDashboard = asyncHandler(async (req, res) => {
  ok(res, await dashboardService.getDashboardStats(req.user));
});

export const listDoctors = asyncHandler(async (req, res) => {
  if (isDoctor(req.user)) {
    const doctorId = requireLinkedDoctor(req.user);
    ok(res, [await doctorService.getDoctor(doctorId)]);
    return;
  }
  ok(res, await doctorService.listDoctors(req.query));
});

export const getDoctor = asyncHandler(async (req, res) => {
  assertNotOtherDoctorRecord(req.user, req.params.id);
  ok(res, await doctorService.getDoctor(req.params.id));
});

export const createDoctor = asyncHandler(async (req, res) => {
  ok(res, await doctorService.createDoctor(req.body), "Doctor created", 201);
});

export const updateDoctor = asyncHandler(async (req, res) => {
  ok(res, await doctorService.updateDoctor(req.params.id, req.body), "Doctor updated");
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  ok(res, await doctorService.deleteDoctor(req.params.id), "Doctor deleted");
});

export const upsertAvailability = asyncHandler(async (req, res) => {
  ok(
    res,
    await doctorService.upsertAvailability(req.params.id, req.body),
    "Availability saved",
  );
});

export const deleteAvailability = asyncHandler(async (req, res) => {
  ok(
    res,
    await doctorService.deleteAvailability(req.params.id, req.params.availabilityId),
    "Availability deleted",
  );
});

export const listServices = asyncHandler(async (req, res) => {
  ok(res, await serviceService.listServices(req.query));
});

export const getService = asyncHandler(async (req, res) => {
  ok(res, await serviceService.getService(req.params.id));
});

export const createService = asyncHandler(async (req, res) => {
  ok(res, await serviceService.createService(req.body), "Service created", 201);
});

export const updateService = asyncHandler(async (req, res) => {
  ok(res, await serviceService.updateService(req.params.id, req.body), "Service updated");
});

export const deleteService = asyncHandler(async (req, res) => {
  ok(res, await serviceService.deleteService(req.params.id), "Service deleted");
});

export const listAppointments = asyncHandler(async (req, res) => {
  ok(
    res,
    await appointmentService.listAppointments({
      ...req.query,
      doctorId: scopedDoctorId(req.user, req.query.doctorId),
    }),
  );
});

export const exportAppointments = asyncHandler(async (req, res) => {
  const rows = await appointmentService.listAppointments({
    ...req.query,
    doctorId: scopedDoctorId(req.user, req.query.doctorId),
  });
  const csv = appointmentService.appointmentsToCsv(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="appointments-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.status(200).send(csv);
});

export const getCalendar = asyncHandler(async (req, res) => {
  ok(
    res,
    await slotService.listCalendarAppointments({
      from: req.query.from,
      to: req.query.to,
      doctorId: scopedDoctorId(req.user, req.query.doctorId),
    }),
  );
});

export const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointment(req.params.id);
  assertNotOtherDoctorRecord(req.user, appointment.doctorId);
  ok(res, appointment);
});

export const createAppointment = asyncHandler(async (req, res) => {
  const doctorId = scopedDoctorId(req.user, req.body.doctorId);
  if (isDoctor(req.user) && req.body.doctorId && req.body.doctorId !== doctorId) {
    throw new AppError("You do not have permission for this action", 403);
  }
  ok(
    res,
    await appointmentService.createAppointment({ ...req.body, doctorId }),
    "Appointment created",
    201,
  );
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const current = await appointmentService.getAppointment(req.params.id);
  assertNotOtherDoctorRecord(req.user, current.doctorId);
  if (isDoctor(req.user) && req.body.doctorId && req.body.doctorId !== current.doctorId) {
    throw new AppError("You do not have permission for this action", 403);
  }
  ok(
    res,
    await appointmentService.updateAppointment(req.params.id, req.body),
    "Appointment updated",
  );
});

export const deleteAppointment = asyncHandler(async (req, res) => {
  const current = await appointmentService.getAppointment(req.params.id);
  assertNotOtherDoctorRecord(req.user, current.doctorId);
  ok(
    res,
    await appointmentService.deleteAppointment(req.params.id),
    "Appointment deleted",
  );
});

export const getAdminSlots = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const doctorId = scopedDoctorId(req.user, query.doctorId);
  ok(res, await slotService.getAvailableSlots(doctorId, query.date));
});

export const listHolidays = asyncHandler(async (_req, res) => {
  ok(res, await scheduleService.listHolidays());
});

export const createHoliday = asyncHandler(async (req, res) => {
  ok(res, await scheduleService.createHoliday(req.body), "Holiday created", 201);
});

export const deleteHoliday = asyncHandler(async (req, res) => {
  ok(res, await scheduleService.deleteHoliday(req.params.id), "Holiday deleted");
});

export const listLeaves = asyncHandler(async (req, res) => {
  const doctorId = scopedDoctorId(
    req.user,
    req.params.id || req.query.doctorId,
  );
  ok(res, await scheduleService.listDoctorLeaves(doctorId));
});

export const createLeave = asyncHandler(async (req, res) => {
  ok(
    res,
    await scheduleService.createDoctorLeave(req.params.id, req.body),
    "Leave day created",
    201,
  );
});

export const deleteLeave = asyncHandler(async (req, res) => {
  ok(
    res,
    await scheduleService.deleteDoctorLeave(req.params.id, req.params.leaveId),
    "Leave day deleted",
  );
});

export const mailStatus = asyncHandler(async (_req, res) => {
  ok(res, await getMailStatus());
});

export const listPatients = asyncHandler(async (req, res) => {
  ok(
    res,
    await patientService.listPatients({
      ...req.query,
      doctorId: isDoctor(req.user) ? requireLinkedDoctor(req.user) : undefined,
    }),
  );
});

export const getPatient = asyncHandler(async (req, res) => {
  ok(
    res,
    await patientService.getPatient(req.params.id, {
      doctorId: isDoctor(req.user) ? requireLinkedDoctor(req.user) : undefined,
      includeFinance: hasPermission(req.user.role, PERMISSIONS.PAYMENTS_READ),
    }),
  );
});

export const createPatient = asyncHandler(async (req, res) => {
  ok(res, await patientService.createPatient(req.body), "Patient created", 201);
});

export const updatePatient = asyncHandler(async (req, res) => {
  ok(res, await patientService.updatePatient(req.params.id, req.body), "Patient updated");
});

export const deletePatient = asyncHandler(async (req, res) => {
  ok(res, await patientService.deletePatient(req.params.id), "Patient deleted");
});

export const addPatientNote = asyncHandler(async (req, res) => {
  ok(
    res,
    await patientService.addPatientNote(
      req.params.id,
      req.body.note,
      req.user?.email,
    ),
    "Note added",
    201,
  );
});

export const listPayments = asyncHandler(async (req, res) => {
  ok(res, await paymentService.listPayments(req.query));
});

export const getFinance = asyncHandler(async (_req, res) => {
  ok(res, await paymentService.getFinanceStats());
});

export const getGatewayConfig = asyncHandler(async (_req, res) => {
  ok(res, paymentGatewayService.getGatewayConfig());
});

export const createCheckout = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPayment(req.params.id);
  ok(
    res,
    await paymentGatewayService.createCheckoutSession({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      gateway: req.body.gateway,
      customerEmail: req.body.customerEmail || payment.patient?.email,
      description: req.body.description,
    }),
    "Checkout session prepared",
    201,
  );
});

export const getPayment = asyncHandler(async (req, res) => {
  ok(res, await paymentService.getPayment(req.params.id));
});

export const createPayment = asyncHandler(async (req, res) => {
  ok(res, await paymentService.createPayment(req.body), "Payment created", 201);
});

export const updatePayment = asyncHandler(async (req, res) => {
  ok(res, await paymentService.updatePayment(req.params.id, req.body), "Payment updated");
});

export const deletePayment = asyncHandler(async (req, res) => {
  ok(res, await paymentService.deletePayment(req.params.id), "Payment deleted");
});

export const listMembershipPlans = asyncHandler(async (_req, res) => {
  ok(res, await membershipService.listPlans());
});

export const getMembershipPlan = asyncHandler(async (req, res) => {
  ok(res, await membershipService.getPlan(req.params.id));
});

export const createMembershipPlan = asyncHandler(async (req, res) => {
  ok(res, await membershipService.createPlan(req.body), "Plan created", 201);
});

export const updateMembershipPlan = asyncHandler(async (req, res) => {
  ok(res, await membershipService.updatePlan(req.params.id, req.body), "Plan updated");
});

export const deleteMembershipPlan = asyncHandler(async (req, res) => {
  ok(res, await membershipService.deletePlan(req.params.id), "Plan deleted");
});

export const listSubscriptions = asyncHandler(async (req, res) => {
  ok(res, await membershipService.listSubscriptions(req.query));
});

export const createSubscription = asyncHandler(async (req, res) => {
  ok(
    res,
    await membershipService.subscribeToPlan(req.body),
    "Subscription created",
    201,
  );
});

export const updateSubscription = asyncHandler(async (req, res) => {
  ok(
    res,
    await membershipService.updateSubscriptionStatus(req.params.id, req.body.status),
    "Subscription updated",
  );
});

export const listInsurance = asyncHandler(async (_req, res) => {
  ok(res, await insuranceService.listProviders());
});

export const createInsurance = asyncHandler(async (req, res) => {
  ok(res, await insuranceService.createProvider(req.body), "Provider created", 201);
});

export const updateInsurance = asyncHandler(async (req, res) => {
  ok(
    res,
    await insuranceService.updateProvider(req.params.id, req.body),
    "Provider updated",
  );
});

export const deleteInsurance = asyncHandler(async (req, res) => {
  ok(res, await insuranceService.deleteProvider(req.params.id), "Provider deleted");
});

export const listPatientInsurance = asyncHandler(async (req, res) => {
  ok(res, await insuranceService.listPatientInsurance(req.query));
});

export const createPatientInsurance = asyncHandler(async (req, res) => {
  ok(
    res,
    await insuranceService.createPatientInsurance(req.body),
    "Patient insurance created",
    201,
  );
});

export const updatePatientInsurance = asyncHandler(async (req, res) => {
  ok(
    res,
    await insuranceService.updatePatientInsurance(req.params.id, req.body),
    "Patient insurance updated",
  );
});

export const deletePatientInsurance = asyncHandler(async (req, res) => {
  ok(
    res,
    await insuranceService.deletePatientInsurance(req.params.id),
    "Patient insurance deleted",
  );
});

export const listGallery = asyncHandler(async (_req, res) => {
  ok(res, await galleryService.listGallery());
});

export const createGallery = asyncHandler(async (req, res) => {
  ok(res, await galleryService.createGalleryItem(req.body), "Gallery item created", 201);
});

export const updateGallery = asyncHandler(async (req, res) => {
  ok(
    res,
    await galleryService.updateGalleryItem(req.params.id, req.body),
    "Gallery item updated",
  );
});

export const deleteGallery = asyncHandler(async (req, res) => {
  ok(res, await galleryService.deleteGalleryItem(req.params.id), "Gallery item deleted");
});

export const listTestimonials = asyncHandler(async (_req, res) => {
  ok(res, await testimonialService.listTestimonials());
});

export const createTestimonial = asyncHandler(async (req, res) => {
  ok(
    res,
    await testimonialService.createTestimonial(req.body),
    "Testimonial created",
    201,
  );
});

export const updateTestimonial = asyncHandler(async (req, res) => {
  ok(
    res,
    await testimonialService.updateTestimonial(req.params.id, req.body),
    "Testimonial updated",
  );
});

export const deleteTestimonial = asyncHandler(async (req, res) => {
  ok(
    res,
    await testimonialService.deleteTestimonial(req.params.id),
    "Testimonial deleted",
  );
});

export const getSettings = asyncHandler(async (_req, res) => {
  ok(res, await settingsService.getSettings());
});

export const updateSettings = asyncHandler(async (req, res) => {
  ok(res, await settingsService.updateSettings(req.body), "Settings updated");
});

export const listFaqs = asyncHandler(async (_req, res) => {
  ok(res, await settingsService.listFaqs());
});

export const createFaq = asyncHandler(async (req, res) => {
  ok(res, await settingsService.createFaq(req.body), "FAQ created", 201);
});

export const updateFaq = asyncHandler(async (req, res) => {
  ok(res, await settingsService.updateFaq(req.params.id, req.body), "FAQ updated");
});

export const deleteFaq = asyncHandler(async (req, res) => {
  ok(res, await settingsService.deleteFaq(req.params.id), "FAQ deleted");
});

export const listContactMessages = asyncHandler(async (req, res) => {
  ok(res, await contactService.listContactMessages(req.query));
});

export const getContactMessage = asyncHandler(async (req, res) => {
  ok(res, await contactService.getContactMessage(req.params.id));
});

export const updateContactMessageStatus = asyncHandler(async (req, res) => {
  ok(
    res,
    await contactService.updateContactMessageStatus(req.params.id, req.body.status),
    "Contact message updated",
  );
});

export const deleteContactMessage = asyncHandler(async (req, res) => {
  ok(
    res,
    await contactService.deleteContactMessage(req.params.id),
    "Contact message deleted",
  );
});

export const listUsers = asyncHandler(async (req, res) => {
  ok(res, await userService.listUsers(req.query));
});

export const getUser = asyncHandler(async (req, res) => {
  ok(res, await userService.getUser(req.params.id));
});

export const createUser = asyncHandler(async (req, res) => {
  ok(res, await userService.createUser(req.body), "User created", 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  ok(
    res,
    await userService.updateUser(req.params.id, req.body, req.user.id),
    "User updated",
  );
});

export const deleteUser = asyncHandler(async (req, res) => {
  ok(
    res,
    await userService.deleteUser(req.params.id, req.user.id),
    "User deleted",
  );
});
