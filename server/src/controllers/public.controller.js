import { asyncHandler } from "../utils/asyncHandler.js";
import * as publicService from "../services/public.service.js";
import { getAvailableSlots } from "../services/slot.service.js";
import * as membershipService from "../services/membership.service.js";
import * as insuranceService from "../services/insurance.service.js";
import { getGatewayConfig } from "../services/paymentGateway.service.js";

const ok = (res, data, message = "OK", status = 200) =>
  res.status(status).json({ success: true, message, data });

export const getWebsiteBundle = asyncHandler(async (_req, res) => {
  ok(res, await publicService.getWebsiteData());
});

export const listServices = asyncHandler(async (_req, res) => {
  ok(res, await publicService.listPublicServices());
});

export const listDoctors = asyncHandler(async (_req, res) => {
  ok(res, await publicService.listPublicDoctors());
});

export const getDoctorDays = asyncHandler(async (req, res) => {
  ok(res, await publicService.getDoctorAvailabilityDays(req.params.id));
});

export const getSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.validatedQuery || req.query;
  ok(res, await getAvailableSlots(doctorId, date));
});

export const createBooking = asyncHandler(async (req, res) => {
  ok(res, await publicService.createPublicBooking(req.body), "Booking submitted", 201);
});

export const listMembershipPlans = asyncHandler(async (_req, res) => {
  ok(res, await membershipService.listPlans({ activeOnly: true }));
});

export const subscribeMembership = asyncHandler(async (req, res) => {
  ok(
    res,
    await membershipService.subscribeToPlan(req.body),
    "Membership subscription submitted",
    201,
  );
});

export const listInsuranceProviders = asyncHandler(async (_req, res) => {
  const providers = await insuranceService.listProviders();
  ok(
    res,
    providers.filter((provider) => provider.isActive),
  );
});

export const paymentOptions = asyncHandler(async (_req, res) => {
  ok(res, getGatewayConfig());
});
