import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import request from "supertest";
import type { RequestHandler } from "express";
import { createPaymentRouter } from "../routes/payment.routes.js";

const requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";
const env = {
  YOOKASSA_SHOP_ID: "test-shop",
  YOOKASSA_SECRET_KEY: "test-key",
  YOOKASSA_RETURN_URL: "https://glowy-ai.ru/payment/success",
};
const authenticate: RequestHandler = (req, _res, next) => {
  req.user = { id: 42 };
  next();
};

const createApp = (overrides: Record<string, unknown> = {}) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.requestId = requestId;
    next();
  });
  app.use(
    "/api/payments",
    createPaymentRouter({
      authenticate,
      env,
      currentTime: () => new Date("2026-08-31T12:00:00.000Z"),
      paidForeverEnabled: () => false,
      ...overrides,
    } as never)
  );
  return app;
};

test("current plan returns the shared public plan state", async () => {
  const response = await request(createApp({
    db: {
      user: {
        findUnique: async () => ({
          plan: "focus",
          subscriptionStatus: "active",
          planExpiresAt: new Date("2026-09-30T12:00:00.000Z"),
        }),
      },
    },
  })).get("/api/payments/current-plan");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    plan: "focus",
    subscriptionStatus: "active",
    planExpiresAt: "2026-09-30T12:00:00.000Z",
  });
});

test("Focus checkout preserves provider amount, currency and metadata", async () => {
  let providerRequest: Record<string, unknown> | undefined;
  const response = await request(createApp({
    db: {
      user: {
        findUnique: async () => ({
          plan: "start",
          subscriptionStatus: "inactive",
          planExpiresAt: null,
        }),
      },
      payment: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          providerPaymentId: "payment-1",
          confirmationUrl: "https://yookassa.ru/checkout/payment-1",
        }),
      },
    },
    fetchImpl: async (_url: unknown, options: { body: string }) => {
      providerRequest = JSON.parse(options.body) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          id: "payment-1",
          status: "pending",
          confirmation: {
            confirmation_url: "https://yookassa.ru/checkout/payment-1",
          },
        }),
      };
    },
  })).post("/api/payments/focus/create");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    paymentId: "payment-1",
    confirmationUrl: "https://yookassa.ru/checkout/payment-1",
  });
  assert.ok(providerRequest);
  assert.deepEqual(providerRequest.amount, { value: "99.00", currency: "RUB" });
  assert.deepEqual(providerRequest.metadata, { userId: 42, plan: "focus" });
});

test("active Focus returns a stable error without provider work", async () => {
  let providerCalled = false;
  const response = await request(createApp({
    db: {
      user: {
        findUnique: async () => ({
          plan: "focus",
          subscriptionStatus: "active",
          planExpiresAt: new Date("2026-09-30T12:00:00.000Z"),
        }),
      },
    },
    fetchImpl: async () => { providerCalled = true; },
  })).post("/api/payments/focus/create");

  assert.equal(response.status, 409);
  assert.equal(response.body.code, "FOCUS_ALREADY_ACTIVE");
  assert.equal(response.body.requestId, requestId);
  assert.equal(providerCalled, false);
});

test("irrelevant webhook events stay acknowledged without database writes", async () => {
  const response = await request(createApp({ db: {} }))
    .post("/api/payments/yookassa/webhook")
    .send({ event: "refund.waiting_for_capture", object: { id: "payment-1" } });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

test("webhook amount mismatch is acknowledged without activating a plan", async () => {
  let transactionCalled = false;
  const response = await request(createApp({
    db: {
      payment: {
        findFirst: async () => ({
          id: 5,
          userId: 42,
          providerPaymentId: "payment-1",
          plan: "focus",
          amountKopeks: 9900,
          currency: "RUB",
          paid: false,
        }),
      },
      $transaction: async () => { transactionCalled = true; },
    },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        id: "payment-1",
        status: "succeeded",
        amount: { value: "1.00", currency: "RUB" },
        metadata: { userId: 42, plan: "focus" },
      }),
    }),
  }))
    .post("/api/payments/yookassa/webhook")
    .send({ event: "payment.succeeded", object: { id: "payment-1" } });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(transactionCalled, false);
});
