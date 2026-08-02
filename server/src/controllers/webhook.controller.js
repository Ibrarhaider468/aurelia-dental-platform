import { asyncHandler } from "../utils/asyncHandler.js";
import * as gateway from "../services/paymentGateway.service.js";

const ok = (res, data, message = "OK") =>
  res.status(200).json({ success: true, message, data });

export const stripeWebhook = asyncHandler(async (req, res) => {
  const rawBody =
    typeof req.body === "string" || Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body || {});

  gateway.verifyStripeWebhookSignature(
    rawBody,
    req.headers["stripe-signature"],
  );

  const payload =
    typeof req.body === "object" && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody);

  const event = await gateway.recordWebhookEvent({
    gateway: "STRIPE",
    eventType: payload.type || "unknown",
    externalId: payload.id || null,
    payload,
  });

  const result = await gateway.processWebhookEvent(event.id, async () => {
    const object = payload.data?.object || {};
    const providerRef = object.payment_intent || object.id || null;
    const mappedStatus =
      payload.type === "payment_intent.succeeded" ||
      payload.type === "checkout.session.completed"
        ? "PAID"
        : payload.type === "payment_intent.payment_failed"
          ? "FAILED"
          : payload.type === "charge.refunded"
            ? "REFUNDED"
            : null;

    if (!providerRef || !mappedStatus) {
      return { ignored: true };
    }

    return gateway.applyGatewayPaymentUpdate({
      providerRef,
      status: mappedStatus,
      gatewayEvent: payload.type,
    });
  });

  ok(res, { eventId: event.id, result }, "Stripe webhook processed");
});

export const paypalWebhook = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const event = await gateway.recordWebhookEvent({
    gateway: "PAYPAL",
    eventType: payload.event_type || "unknown",
    externalId: payload.id || null,
    payload,
  });

  const result = await gateway.processWebhookEvent(event.id, async () => {
    const resource = payload.resource || {};
    const providerRef = resource.id || resource.supplementary_data?.related_ids?.order_id;
    const mappedStatus =
      payload.event_type === "PAYMENT.CAPTURE.COMPLETED"
        ? "PAID"
        : payload.event_type === "PAYMENT.CAPTURE.DENIED"
          ? "FAILED"
          : payload.event_type === "PAYMENT.CAPTURE.REFUNDED"
            ? "REFUNDED"
            : null;

    if (!providerRef || !mappedStatus) {
      return { ignored: true };
    }

    return gateway.applyGatewayPaymentUpdate({
      providerRef,
      status: mappedStatus,
      gatewayEvent: payload.event_type,
    });
  });

  ok(res, { eventId: event.id, result }, "PayPal webhook processed");
});
