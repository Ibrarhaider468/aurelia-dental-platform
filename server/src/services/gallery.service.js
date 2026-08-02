import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export async function listGallery() {
  return prisma.gallery.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getGalleryItem(id) {
  const item = await prisma.gallery.findUnique({ where: { id } });
  if (!item) throw new AppError("Gallery item not found", 404);
  return item;
}

export async function createGalleryItem(data) {
  return prisma.gallery.create({
    data: {
      beforeImage: data.beforeImage,
      afterImage: data.afterImage,
      treatment: data.treatment,
      caption: data.caption || null,
      isPublished: data.isPublished ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateGalleryItem(id, data) {
  await getGalleryItem(id);
  return prisma.gallery.update({
    where: { id },
    data: {
      ...(data.beforeImage !== undefined ? { beforeImage: data.beforeImage } : {}),
      ...(data.afterImage !== undefined ? { afterImage: data.afterImage } : {}),
      ...(data.treatment !== undefined ? { treatment: data.treatment } : {}),
      ...(data.caption !== undefined ? { caption: data.caption } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteGalleryItem(id) {
  await getGalleryItem(id);
  await prisma.gallery.delete({ where: { id } });
  return { message: "Gallery item deleted" };
}
