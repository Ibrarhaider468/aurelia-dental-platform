import { ZodError } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(_req, _res, next) {
  next(new AppError("Resource not found", 404));
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists",
      details: err.meta?.target ?? null,
    });
  }

  if (err?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found",
    });
  }

  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational || env.isDev
      ? err.message || "Internal server error"
      : "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(env.isDev && !err.isOperational
      ? { stack: err.stack }
      : {}),
    ...(err.details ? { details: err.details } : {}),
  });
}
