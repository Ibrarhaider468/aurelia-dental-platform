import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../services/token.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    doctorId: user.doctor?.id ?? null,
  };

  next();
});

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    return next();
  };
}
