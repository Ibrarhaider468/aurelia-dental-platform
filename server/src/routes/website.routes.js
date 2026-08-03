import { Router } from "express";
import * as website from "../controllers/website.controller.js";

const router = Router();

router.get("/", website.renderHome);
router.get("/treatments", website.renderTreatments);
router.get("/treatments/:slug", website.renderTreatmentDetail);
router.get("/dentists", website.renderDoctors);
router.get("/dentists/:slug", website.renderDoctorDetail);
router.get("/book", website.renderBooking);
router.get("/payments", website.renderPayments);
router.get("/membership", website.renderMembership);
router.get("/insurance", website.renderInsurance);

export default router;
