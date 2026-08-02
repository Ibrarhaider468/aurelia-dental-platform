import { Router } from "express";
import authRoutes from "./auth.routes.js";
import adminRoutes from "./admin.routes.js";
import publicRoutes from "./public.routes.js";
import webhookRoutes from "./webhook.routes.js";
import { health } from "../controllers/health.controller.js";

const router = Router();

router.get("/health", health);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/public", publicRoutes);
router.use("/webhooks", webhookRoutes);

export default router;
