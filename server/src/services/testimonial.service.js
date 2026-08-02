import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export async function listTestimonials() {
  return prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getTestimonial(id) {
  const item = await prisma.testimonial.findUnique({ where: { id } });
  if (!item) throw new AppError("Testimonial not found", 404);
  return item;
}

export async function createTestimonial(data) {
  return prisma.testimonial.create({
    data: {
      patientName: data.patientName,
      review: data.review,
      rating: data.rating ?? 5,
      isApproved: data.isApproved ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateTestimonial(id, data) {
  await getTestimonial(id);
  return prisma.testimonial.update({
    where: { id },
    data: {
      ...(data.patientName !== undefined ? { patientName: data.patientName } : {}),
      ...(data.review !== undefined ? { review: data.review } : {}),
      ...(data.rating !== undefined ? { rating: data.rating } : {}),
      ...(data.isApproved !== undefined ? { isApproved: data.isApproved } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteTestimonial(id) {
  await getTestimonial(id);
  await prisma.testimonial.delete({ where: { id } });
  return { message: "Testimonial deleted" };
}
