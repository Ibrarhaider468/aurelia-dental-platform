import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { signAccessToken } from "./token.service.js";
import { normalizeRole, resolvePermissions } from "../constants/roles.js";

const SALT_ROUNDS = 12;

function sanitizeUser(user) {
  const role = normalizeRole(user.role);
  const customPermissions = user.customPermissions || [];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    isActive: user.isActive,
    doctorId: user.doctor?.id ?? null,
    permissions: resolvePermissions(role, customPermissions),
    customPermissions,
    createdAt: user.createdAt,
  };
}

export async function registerUser({ name, email, password, role = "STAFF" }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError("Email is already registered", 409);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
    },
    include: { doctor: true },
  });

  const sanitized = sanitizeUser(user);
  const token = signAccessToken({
    sub: user.id,
    role: sanitized.role,
    email: user.email,
  });

  return { user: sanitized, token };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { doctor: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  const sanitized = sanitizeUser(user);
  const token = signAccessToken({
    sub: user.id,
    role: sanitized.role,
    email: user.email,
  });

  return { user: sanitized, token };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { doctor: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("User not found", 404);
  }

  return sanitizeUser(user);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new AppError("Current password is incorrect", 400);
  }

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { message: "Password updated successfully" };
}
