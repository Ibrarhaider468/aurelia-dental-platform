import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { ASSIGNABLE_ROLES, normalizeRole, ROLES } from "../constants/roles.js";

const SALT_ROUNDS = 12;

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    isActive: user.isActive,
    doctorId: user.doctor?.id ?? null,
    doctor: user.doctor
      ? { id: user.doctor.id, name: user.doctor.name }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function linkDoctor(userId, doctorId, role) {
  const normalized = normalizeRole(role);

  if (normalized === ROLES.DOCTOR) {
    if (!doctorId) {
      throw new AppError("doctorId is required for DOCTOR accounts", 400);
    }
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new AppError("Doctor profile not found", 404);
    if (doctor.userId && doctor.userId !== userId) {
      throw new AppError("Doctor profile is already linked to another user", 409);
    }

    await prisma.doctor.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await prisma.doctor.update({
      where: { id: doctorId },
      data: { userId },
    });
    return;
  }

  await prisma.doctor.updateMany({
    where: { userId },
    data: { userId: null },
  });
}

export async function listUsers({ search } = {}) {
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { doctor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return users.map(sanitizeUser);
}

export async function getUser(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { doctor: { select: { id: true, name: true } } },
  });
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
}

export async function createUser(data) {
  const role = normalizeRole(data.role);
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("Email is already registered", 409);

  const password = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      password,
      role,
      isActive: data.isActive ?? true,
    },
  });

  await linkDoctor(user.id, data.doctorId, role);
  return getUser(user.id);
}

export async function updateUser(id, data, actorId) {
  const current = await prisma.user.findUnique({
    where: { id },
    include: { doctor: true },
  });
  if (!current) throw new AppError("User not found", 404);

  if (actorId === id && data.isActive === false) {
    throw new AppError("You cannot deactivate your own account", 400);
  }

  if (
    actorId === id &&
    data.role &&
    normalizeRole(data.role) !== normalizeRole(current.role)
  ) {
    throw new AppError("You cannot change your own role", 400);
  }

  const nextRole = data.role ? normalizeRole(data.role) : normalizeRole(current.role);
  if (data.role && !ASSIGNABLE_ROLES.includes(nextRole)) {
    throw new AppError("Invalid role", 400);
  }

  if (data.email) {
    const email = data.email.toLowerCase();
    const clash = await prisma.user.findFirst({
      where: { email, id: { not: id } },
    });
    if (clash) throw new AppError("Email is already registered", 409);
  }

  const password = data.password
    ? await bcrypt.hash(data.password, SALT_ROUNDS)
    : undefined;

  await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      ...(password ? { password } : {}),
      ...(data.role !== undefined ? { role: nextRole } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  if (data.role !== undefined || data.doctorId !== undefined) {
    const doctorId =
      data.doctorId !== undefined ? data.doctorId : current.doctor?.id;
    await linkDoctor(id, doctorId, nextRole);
  }

  return getUser(id);
}

export async function deleteUser(id, actorId) {
  if (actorId === id) {
    throw new AppError("You cannot delete your own account", 400);
  }
  await getUser(id);
  await prisma.doctor.updateMany({
    where: { userId: id },
    data: { userId: null },
  });
  await prisma.user.delete({ where: { id } });
  return { message: "User deleted" };
}
