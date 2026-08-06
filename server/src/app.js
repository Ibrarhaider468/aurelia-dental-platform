import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import websiteRoutes from "./routes/website.routes.js";
import seoRoutes from "./routes/seo.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.disable("x-powered-by");
  app.set("etag", false);

  app.use(
    helmet({
      contentSecurityPolicy: env.isDev
        ? false
        : {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "script-src": ["'self'"],
              "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
              "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
              "img-src": ["'self'", "data:", "https:", "blob:"],
              "connect-src": ["'self'", env.clientUrl],
              "frame-src": ["'self'", "https://www.google.com"],
              "object-src": ["'none'"],
              "base-uri": ["'self'"],
              "form-action": ["'self'"],
            },
          },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  app.use(compression());

  // CLIENT_URL / CORS_ORIGINS may be comma-separated (Cloudflare Pages + custom domain)
  const allowedOrigins = new Set(
    [
      ...String(env.clientUrl || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      ...String(env.corsOrigins || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      env.publicSiteUrl,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ].filter(Boolean),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(morgan(env.isDev ? "dev" : "combined"));

  app.use(
    express.static(path.join(__dirname, "public"), {
      maxAge: env.isDev ? 0 : "7d",
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // Admin SPA APIs must not be cached — browsers/proxies may otherwise return 304
  // with an empty body, which breaks JSON clients (especially /auth/me).
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    next();
  });

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.isDev ? 500 : 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many requests. Please try again later.",
      },
    }),
  );

  app.use(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      // Dev needs headroom for QA retries; successful logins do not count.
      max: env.isDev ? 200 : 20,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
      },
    }),
  );

  app.get("/api", (_req, res) => {
    res.json({
      success: true,
      message: "Aurelia Dental Platform API",
      data: {
        version: "1.0.0",
        phase: 6,
        docs: {
          health: "GET /api/health",
          public: "GET /api/public/*",
          booking: "POST /api/public/bookings",
          admin: "/api/admin/*",
        },
      },
    });
  });

  app.use(seoRoutes);
  app.use("/api", apiRoutes);
  app.use(websiteRoutes);

  if (!env.isDev && env.serveAdmin) {
    const adminDist = path.resolve(__dirname, "../../admin/dist");
    app.use(
      "/admin",
      express.static(adminDist, {
        maxAge: "7d",
        index: false,
      }),
    );
    app.get(/^\/admin(?:\/.*)?$/, (req, res, next) => {
      if (path.extname(req.path)) return next();
      res.sendFile(path.join(adminDist, "index.html"), (err) => {
        if (err) next();
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
