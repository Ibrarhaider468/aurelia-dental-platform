import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

/**
 * Cloudinary integration stub — ready for Phase 2 upload flows.
 * Configure CLOUDINARY_* env vars, then wire multer + cloudinary SDK.
 */
export function isCloudinaryConfigured() {
  return Boolean(
    env.cloudinary.cloudName &&
      env.cloudinary.apiKey &&
      env.cloudinary.apiSecret,
  );
}

export function getCloudinaryConfig() {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: env.cloudinary.cloudName || null,
    folder: env.cloudinary.folder,
  };
}

export async function uploadImage(_file) {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      503,
    );
  }

  throw new AppError(
    "Cloudinary upload will be enabled in Phase 2 (Admin uploads).",
    501,
  );
}
