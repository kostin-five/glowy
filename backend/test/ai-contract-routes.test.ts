import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { RequestHandler } from "express";
import type { AiReservation } from "../services/ai/ai-limits.service.js";
import { createApp } from "../app.js";
import { createAiRouter } from "../routes/ai.routes.js";

const allowedOrigin = "http://localhost:5173";
const testJwtSecret = "test-only-ai-contract-key";

process.env.JWT_SECRET = testJwtSecret;

const authHeader = () =>
  `Bearer ${jwt.sign({ id: 1, channel: "web" }, testJwtSecret)}`;

const createIsolatedAiApp = (overrides: Record<string, unknown> = {}) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";
    next();
  });
  app.use(
    "/api/ai",
    createAiRouter({
      db: {
        task: { findMany: async () => [] },
        user: { findUnique: async () => ({ currentEnergy: 50, aiTone: "calm" }) },
      },
      authenticate: ((req, _res, next) => {
        req.user = { id: 42 };
        next();
      }) satisfies RequestHandler,
      ...overrides,
    } as never)
  );
  return app;
};

test("authenticated Mind Hub rejects a missing session before validation", async () => {
  const response = await request(createApp())
    .post("/api/ai/mind-hub")
    .set("Origin", allowedOrigin)
    .send({ message: "Помоги разобрать задачи", hubMode: "auto" });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Пользователь не авторизован");
});

test("the removed public Mind Hub path cannot reach AI handling", async () => {
  const response = await request(createApp())
    .post("/api/ai/mind-hub/public")
    .set("Origin", allowedOrigin)
    .send({});

  assert.equal(response.status, 404);
});

test("authenticated Mind Hub returns a safe request-ID validation error", async () => {
  const response = await request(createApp())
    .post("/api/ai/mind-hub")
    .set("Origin", allowedOrigin)
    .set("Authorization", authHeader())
    .send({ message: "   ", hubMode: "unexpected" });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AI_REQUEST_INVALID");
  assert.equal(response.body.requestId, response.headers["x-request-id"]);
  assert.equal(response.body.error, "Проверь сообщение и параметры запроса.");
  assert.ok(Array.isArray(response.body.details));
  assert.equal(JSON.stringify(response.body).includes("unexpected"), false);
});

test("a denied reservation skips the Mind Hub provider", async () => {
  let providerCalled = false;
  const response = await request(
    createIsolatedAiApp({
      reserveRequest: async () => ({
        allowed: false,
        limit: { limit: 10, remaining: 0, resetAt: "2026-09-01T12:00:00.000Z" },
      }),
      parseDrafts: async () => {
        providerCalled = true;
      },
    })
  )
    .post("/api/ai/mind-hub")
    .send({ message: "Помоги", hubMode: "auto" });

  assert.equal(response.status, 429);
  assert.equal(providerCalled, false);
});

test("a provider failure releases its Mind Hub reservation", async () => {
  const token = {
    userId: 42,
    cost: 1,
    resetAt: "2026-09-01T12:00:00.000Z",
  };
  let released: AiReservation | undefined;
  const response = await request(
    createIsolatedAiApp({
      reserveRequest: async () => ({
        allowed: true,
        reservation: token,
        limit: { limit: 10, remaining: 9, resetAt: token.resetAt },
      }),
      releaseRequest: async (reservation: AiReservation) => {
        released = reservation;
        return {
          released: true,
          limit: { limit: 10, remaining: 10, resetAt: token.resetAt },
        };
      },
      parseDrafts: async () => {
        throw Object.assign(new Error("provider unavailable"), {
          code: "AI_PROVIDER_TIMEOUT",
        });
      },
    })
  )
    .post("/api/ai/mind-hub")
    .send({ message: "Помоги", hubMode: "auto" });

  assert.equal(response.status, 200);
  assert.deepEqual(released, token);
  assert.equal(response.body.limit.remaining, 10);
  assert.equal(response.body.aiUnavailable, true);
});

test("an open provider circuit returns a graceful reply without task mutation", async () => {
  const token = {
    userId: 42,
    cost: 1,
    resetAt: "2026-09-01T12:00:00.000Z",
  };
  let released = false;
  let taskMutation = false;
  const response = await request(
    createIsolatedAiApp({
      db: {
        task: {
          findMany: async () => [],
          create: async () => { taskMutation = true; },
          update: async () => { taskMutation = true; },
        },
        user: { findUnique: async () => ({ currentEnergy: 50, aiTone: "calm" }) },
      },
      reserveRequest: async () => ({
        allowed: true,
        reservation: token,
        limit: { limit: 10, remaining: 9, resetAt: token.resetAt },
      }),
      releaseRequest: async () => {
        released = true;
        return {
          released: true,
          limit: { limit: 10, remaining: 10, resetAt: token.resetAt },
        };
      },
      parseDrafts: async () => {
        throw Object.assign(new Error("circuit open"), {
          code: "AI_PROVIDER_CIRCUIT_OPEN",
          retryable: true,
        });
      },
    })
  )
    .post("/api/ai/mind-hub")
    .send({ message: "Помоги", hubMode: "auto" });

  assert.equal(response.status, 200);
  assert.equal(response.body.aiUnavailable, true);
  assert.equal(response.body.retryable, true);
  assert.equal(released, true);
  assert.equal(taskMutation, false);
});
