import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { slugify } from "../utils/slugify.js";

function normalizeEmpty(value) {
  if (value === "" || value === undefined) return null;
  return value;
}

export async function listServices({ search } = {}) {
  return prisma.service.findMany({
    where: search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

export async function getService(id) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new AppError("Service not found", 404);
  return service;
}

export async function createService(data) {
  const slug = data.slug ? slugify(data.slug) : slugify(data.title);
  return prisma.service.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      image: normalizeEmpty(data.image),
      duration: data.duration,
      price: data.price,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateService(id, data) {
  await getService(id);
  return prisma.service.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: slugify(data.slug) } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.image !== undefined ? { image: normalizeEmpty(data.image) } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteService(id) {
  await getService(id);
  const linked = await prisma.appointment.count({ where: { serviceId: id } });
  if (linked > 0) {
    throw new AppError(
      "Cannot delete service with existing appointments. Deactivate it instead.",
      400,
    );
  }
  await prisma.service.delete({ where: { id } });
  return { message: "Service deleted" };
}
