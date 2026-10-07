import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import request from "supertest";
import type { RequestHandler } from "express";
import { createPaymentRouter } from "../routes/payment.routes.js";

const requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";
const env = {
  PAYMENTS_ENABLED: "true",
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

test("unknown and malformed payment identifiers never call the provider", async () => {
  let calls = 0;
  const app = createApp({ db: { payment: { findFirst: async () => null } }, fetchImpl: async () => { calls++; } });
  for (const id of ["unknown-payment", "../../private", "x".repeat(65)]) {
    assert.equal((await request(app).post("/api/payments/yookassa/webhook").send({ event: "payment.succeeded", object: { id } })).status, 200);
  }
  assert.equal(calls, 0);
});

test("checkout never accepts a non-HTTPS confirmation URL", async () => {
  let writes = 0;
  const response = await request(createApp({
    db: { user: { findUnique: async () => ({ plan: "start", subscriptionStatus: "inactive" }) }, payment: { create: async () => { writes++; } } },
    fetchImpl: async () => ({ ok: true, json: async () => ({ id: "unsafe-checkout", status: "pending", confirmation: { confirmation_url: "javascript:alert(1)" } }) }),
  })).post("/api/payments/focus/create");
  assert.equal(response.status, 500);
  assert.equal(writes, 0);
});

test("portfolio checkout is disabled server-side without provider work", async () => {
  let calls = 0;
  const app = createApp({ env: { ...env, PAYMENTS_ENABLED: "false" }, db: {}, fetchImpl: async () => { calls++; } });
  assert.equal((await request(app).post("/api/payments/focus/create")).status, 403);
  assert.equal(calls, 0);
});

test("concurrent succeeded and canceled events activate an entitlement at most once", async () => {
  let paid = false;
  let activations = 0;
  let state = "pending";
  const payment = { id: 5, userId: 42, providerPaymentId: "payment-race", plan: "focus", amountKopeks: 9900, currency: "RUB" };
  const updateMany = async ({ data }: { data: { paid: boolean; status: string } }) => {
    if (paid) return { count: 0 };
    paid = data.paid;
    state = data.status;
    return { count: 1 };
  };
  let providerCalls = 0;
  const app = createApp({
    db: { payment: { findFirst: async () => ({ ...payment, paid }), updateMany },
      $transaction: async (work: (tx: unknown) => Promise<void>) => work({ payment: { updateMany }, user: { update: async () => { activations++; } } }),
    },
    fetchImpl: async (_url: unknown, options: { signal: AbortSignal }) => {
      assert.ok(options.signal);
      const index = providerCalls++;
      return { ok: true, json: async () => ({ id: "payment-race", status: index === 2 ? "canceled" : "succeeded", amount: { value: "99.00", currency: "RUB" }, metadata: { userId: 42, plan: "focus" } }) };
    },
  });
  const responses = await Promise.all(["payment.succeeded", "payment.succeeded", "payment.canceled"].map((event) => request(app).post("/api/payments/yookassa/webhook").send({ event, object: { id: "payment-race" } })));
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(activations, 1);
  assert.equal(paid, true);
  assert.equal(state, "succeeded");
});

test("a stalled provider request is bounded by an abort signal", async () => {
  const app = createApp({
    db: { payment: { findFirst: async () => ({ id: 5, providerPaymentId: "payment-timeout" }) } },
    fetchImpl: async (_url: unknown, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("SENTINEL_PROVIDER_ERROR")), { once: true });
    }),
  });
  const started = Date.now();
  const response = await request(app).post("/api/payments/yookassa/webhook").send({ event: "payment.succeeded", object: { id: "payment-timeout" } });
  assert.equal(response.status, 500);
  assert.ok(Date.now() - started < 15_000);
  assert.doesNotMatch(JSON.stringify(response.body), /SENTINEL/);
});
