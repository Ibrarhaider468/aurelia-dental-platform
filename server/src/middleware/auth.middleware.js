import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../services/token.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  hasPermission,
  normalizeRole,
  resolvePermissions,
} from "../constants/roles.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = header.slice(7);
  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: { doctor: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("Authentication required", 401);
  }

  const role = normalizeRole(user.role);
  const permissions = resolvePermissions(role, user.customPermissions);

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    doctorId: user.doctor?.id ?? null,
    permissions,
    customPermissions: user.customPermissions || [],
  };

  next();
});

export function authorize(...roles) {
  const allowed = roles.map(normalizeRole);
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowed.includes(normalizeRole(req.user.role))) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    return next();
  };
}

export function requirePermission(...permissions) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const ok = permissions.some((permission) =>
      hasPermission(req.user.role, permission, req.user.permissions),
    );

    if (!ok) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    return next();
  };
}

/** Ensures DOCTOR users only touch their linked doctor profile. */
export function requireOwnDoctorParam(paramName = "id") {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (normalizeRole(req.user.role) !== "DOCTOR") {
      return next();
    }

    if (!req.user.doctorId) {
      return next(new AppError("Doctor profile is not linked to this account", 403));
    }

    if (req.params[paramName] !== req.user.doctorId) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    return next();
  };
}
