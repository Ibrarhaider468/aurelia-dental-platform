import crypto from "crypto";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export function getGatewayConfig() {
  return {
    currency: env.payments.currency,
    stripe: {
      configured: Boolean(env.payments.stripe.secretKey),
      publishableKey: env.payments.stripe.publishableKey || null,
    },
    paypal: {
      configured: Boolean(
        env.payments.paypal.clientId && env.payments.paypal.clientSecret,
      ),
      mode: env.payments.paypal.mode,
      clientId: env.payments.paypal.clientId || null,
    },
    supportedMethods: [
      "PRIVATE",
      "INSURANCE",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "APPLE_PAY",
      "GOOGLE_PAY",
      "BANK_TRANSFER",
      "FINANCE_PLAN",
      "MEMBERSHIP",
    ],
    supportedGateways: [
      "MANUAL",
      "STRIPE",
      "PAYPAL",
      "CARD",
      "APPLE_PAY",
      "GOOGLE_PAY",
    ],
  };
}

/**
 * Creates a provider-ready checkout intent.
 * Stripe/PayPal SDKs can replace the stub session once keys are configured.
 */
export async function createCheckoutSession({
  paymentId,
  amount,
  currency = env.payments.currency,
  gateway = "STRIPE",
  customerEmail,
  description,
}) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AppError("Payment not found", 404);
  if (payment.status === "PAID") {
    throw new AppError("Payment is already completed", 400);
  }

  if (gateway === "STRIPE" && !env.payments.stripe.secretKey) {
    throw new AppError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.",
      503,
    );
  }

  if (gateway === "PAYPAL" && !env.payments.paypal.clientId) {
    throw new AppError(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      503,
    );
  }

  const sessionId = `${gateway.toLowerCase()}_sess_${crypto.randomBytes(12).toString("hex")}`;
  const providerRef = `${gateway.toLowerCase()}_${crypto.randomBytes(8).toString("hex")}`;

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      gateway,
      checkoutSession: sessionId,
      providerRef,
      currency,
      amount,
      metadata: {
        ...(payment.metadata || {}),
        customerEmail: customerEmail || null,
        description: description || null,
        successUrl: env.payments.successUrl,
        cancelUrl: env.payments.cancelUrl,
        preparedAt: new Date().toISOString(),
      },
    },
  });

  return {
    payment: updated,
    checkout: {
      sessionId,
      providerRef,
      gateway,
      amount: Number(amount),
      currency,
      mode: "preparation",
      publishableKey:
        gateway === "STRIPE" ? env.payments.stripe.publishableKey || null : null,
      approveUrl: null,
      message:
        "Checkout session prepared. Connect Stripe/PayPal SDK using the stored session identifiers.",
    },
  };
}

export function verifyStripeWebhookSignature(rawBody, signatureHeader) {
  if (!env.payments.stripe.webhookSecret) {
    if (env.isDev) return true;
    throw new AppError("STRIPE_WEBHOOK_SECRET is not configured", 503);
  }
  if (!signatureHeader) {
    throw new AppError("Missing Stripe signature header", 401);
  }

  // Structural verification — replace with stripe.webhooks.constructEvent in production.
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k, v];
    }),
  );

  if (!parts.t || !parts.v1) {
    throw new AppError("Invalid Stripe signature format", 401);
  }

  const signedPayload = `${parts.t}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", env.payments.stripe.webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const provided = Buffer.from(parts.v1);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) {
    if (env.isDev) return true;
    throw new AppError("Stripe webhook signature verification failed", 401);
  }

  const valid = crypto.timingSafeEqual(expectedBuf, provided);
  if (!valid && !env.isDev) {
    throw new AppError("Stripe webhook signature verification failed", 401);
  }

  return true;
}

export async function recordWebhookEvent({
  gateway,
  eventType,
  externalId,
  payload,
}) {
  return prisma.paymentWebhookEvent.create({
    data: {
      gateway,
      eventType,
      externalId: externalId || null,
      payload,
      status: "RECEIVED",
    },
  });
}

export async function processWebhookEvent(eventId, handler) {
  const event = await prisma.paymentWebhookEvent.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new AppError("Webhook event not found", 404);

  try {
    const result = await handler(event);
    await prisma.paymentWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        error: null,
      },
    });
    return result;
  } catch (error) {
    await prisma.paymentWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: "FAILED",
        error: error.message,
        processedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function applyGatewayPaymentUpdate({
  providerRef,
  status,
  gatewayEvent,
}) {
  const payment = await prisma.payment.findFirst({
    where: { providerRef },
  });
  if (!payment) {
    return { matched: false };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : payment.paidAt,
      metadata: {
        ...(payment.metadata || {}),
        lastGatewayEvent: gatewayEvent || null,
        updatedByWebhookAt: new Date().toISOString(),
      },
    },
  });

  return { matched: true, payment: updated };
}
