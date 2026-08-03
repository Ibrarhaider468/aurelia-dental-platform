import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as publicController from "../controllers/public.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  bookingSchema,
  contactMessageSchema,
  slotsQuerySchema,
} from "../validators/public.validators.js";
import { membershipSubscribeSchema } from "../validators/admin.validators.js";

const router = Router();

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many booking attempts. Please try again later.",
  },
});

router.get("/website", publicController.getWebsiteBundle);
router.get("/services", publicController.listServices);
router.get("/doctors", publicController.listDoctors);
router.get("/doctors/:id/days", publicController.getDoctorDays);
router.get(
  "/slots",
  validate(slotsQuerySchema, "query"),
  publicController.getSlots,
);
router.post(
  "/bookings",
  bookingLimiter,
  validate(bookingSchema),
  publicController.createBooking,
);
router.get("/membership-plans", publicController.listMembershipPlans);
router.post(
  "/memberships/subscribe",
  bookingLimiter,
  validate(membershipSubscribeSchema),
  publicController.subscribeMembership,
);
router.get("/insurance", publicController.listInsuranceProviders);
router.get("/payment-options", publicController.paymentOptions);
router.post(
  "/contact",
  bookingLimiter,
  validate(contactMessageSchema),
  publicController.createContactMessage,
);

export default router;
