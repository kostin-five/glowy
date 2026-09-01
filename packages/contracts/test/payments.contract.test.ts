import assert from "node:assert/strict";
import test from "node:test";
import {
  paymentCheckoutSchema,
  paymentErrorSchema,
  paymentPlanStateSchema,
  paymentWebhookAckSchema,
} from "../dist/index.js";

const requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";

test("parses plan, checkout and webhook acknowledgement contracts", () => {
  assert.equal(
    paymentPlanStateSchema.parse({
      plan: "focus",
      subscriptionStatus: "active",
      planExpiresAt: "2026-09-30T12:00:00.000Z",
    }).plan,
    "focus"
  );
  assert.equal(
    paymentCheckoutSchema.parse({
      paymentId: "payment-1",
      confirmationUrl: "https://yookassa.ru/checkout/payment-1",
    }).paymentId,
    "payment-1"
  );
  assert.equal(paymentWebhookAckSchema.parse({ ok: true }).ok, true);
});

test("parses unavailable-plan and rate-limit errors", () => {
  assert.equal(
    paymentErrorSchema.parse({
      error: "Бесплатная активация Forever больше недоступна",
      code: "PLAN_UNAVAILABLE",
      requestId,
    }).code,
    "PLAN_UNAVAILABLE"
  );
  assert.equal(
    paymentErrorSchema.parse({
      error: "Слишком много попыток.",
      code: "PAYMENT_RATE_LIMITED",
      requestId,
      limit: 5,
    }).limit,
    5
  );
});
