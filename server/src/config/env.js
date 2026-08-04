import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";
const isDev = nodeEnv !== "production";

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireProd(name, minLength = 1) {
  const value = process.env[name];
  if (!isDev) {
    if (!value || value.length < minLength) {
      throw new Error(
        `Missing or weak required environment variable in production: ${name}`,
      );
    }
  }
  return value || "";
}

const jwtSecret = isDev
  ? required("JWT_SECRET", "dev-only-change-me-use-long-secret-in-prod")
  : requireProd("JWT_SECRET", 32);

if (
  !isDev &&
  (jwtSecret.includes("change-me") || jwtSecret.includes("dev-only"))
) {
  throw new Error("JWT_SECRET must be a unique production secret");
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT || 4000),
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://aurelia:aurelia_dev_password@localhost:5432/aurelia_dental?schema=public",
  ),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || (isDev ? "7d" : "1d"),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  publicSiteUrl: process.env.PUBLIC_SITE_URL || "http://localhost:4000",
  serveAdmin: process.env.SERVE_ADMIN !== "false",
  trustProxy: process.env.TRUST_PROXY === "true" || !isDev,
  adminEmail: process.env.ADMIN_EMAIL || "admin@aureliadental.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin123!",
  adminName: process.env.ADMIN_NAME || "Clinic Admin",
  mail: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "Aurelia Dental <noreply@aureliadental.com>",
  },
  payments: {
    currency: process.env.PAYMENT_CURRENCY || "USD",
    successUrl:
      process.env.PAYMENT_SUCCESS_URL ||
      "http://localhost:4000/payments?status=success",
    cancelUrl:
      process.env.PAYMENT_CANCEL_URL ||
      "http://localhost:4000/payments?status=cancelled",
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || "",
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
      webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
      mode: process.env.PAYPAL_MODE || "sandbox",
    },
  },
  isDev,
};

if (!isDev && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production");
}
