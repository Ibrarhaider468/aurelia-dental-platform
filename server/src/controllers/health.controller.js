import { prisma } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const health = asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    success: true,
    message: "Aurelia Dental API is healthy",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      phase: 6,
    },
  });
});
