import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { PERMISSIONS } from "../constants/roles.js";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "../validators/auth.validators.js";

const router = Router();

router.post("/login", validate(loginSchema), authController.login);

router.post(
  "/register",
  authenticate,
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(registerSchema),
  authController.register,
);

router.get("/me", authenticate, authController.me);

router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
