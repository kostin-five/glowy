import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { RequestHandler } from "express";
import type { AiReservation } from "../services/ai/ai-limits.service.js";
import { createApp } from "../app.js";
import { createAiRouter } from "../routes/ai.routes.js";
import { getDatabasePoolConfig } from "../lib/prisma.js";

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

test("remote PostgreSQL cannot disable certificate verification through its URL", () => {
  const config = getDatabasePoolConfig({ DATABASE_URL: "postgresql://demo:demo@db.example.test/glowy?sslmode=no-verify&sslrootcert=ignored", DATABASE_CA_CERT: "test-ca" });
  assert.deepEqual(config.ssl, { rejectUnauthorized: true, ca: "test-ca" });
  assert.equal(new URL(config.connectionString!).searchParams.has("sslmode"), false);
  assert.throws(() => getDatabasePoolConfig({ DATABASE_URL: "postgresql://demo:demo@db.example.test/glowy", DATABASE_TLS_MODE: "local" }));
  assert.throws(() => getDatabasePoolConfig({ DATABASE_URL: "postgresql://demo:demo@localhost/glowy", DATABASE_TLS_MODE: "local", NODE_ENV: "production" }));
  assert.equal(getDatabasePoolConfig({ DATABASE_URL: "postgresql://demo:demo@localhost/glowy", DATABASE_TLS_MODE: "local" }).ssl, false);
});

test("task analysis enforces the quota before invoking the provider", async () => {
  let called = false;
  const app = createIsolatedAiApp({
    db: { task: { findMany: async () => [{ title: "Demo", completed: false, subtasks: [] }] }, user: { findUnique: async () => ({ currentEnergy: 50 }) } },
    reserveRequest: async () => ({ allowed: false, limit: { remaining: 0 } }),
    generateContent: async () => { called = true; return { text: "Demo" }; },
  });
  const response = await request(app).post("/api/ai/analyze").send({});
  assert.equal(response.status, 429);
  assert.equal(called, false);
});

test("task analysis releases its reservation when generation fails", async () => {
  const token = { userId: 42, cost: 1, resetAt: null };
  let released: unknown;
  const app = createIsolatedAiApp({
    db: { task: { findMany: async () => [{ title: "Demo", completed: false, subtasks: [] }] }, user: { findUnique: async () => ({ currentEnergy: 50 }) } },
    reserveRequest: async () => ({ allowed: true, reservation: token }),
    releaseRequest: async (value: unknown) => { released = value; },
    generateContent: async () => { throw Object.assign(new Error("timeout"), { code: "AI_PROVIDER_TIMEOUT" }); },
  });
  await request(app).post("/api/ai/analyze").send({});
  assert.deepEqual(released, token);
});

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
  const response = await request(createIsolatedAiApp())
    .post("/api/ai/mind-hub")
    .set("Origin", allowedOrigin)
    .set("Authorization", authHeader())
    .send({ message: "   ", hubMode: "unexpected" });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AI_REQUEST_INVALID");
  assert.equal(response.body.requestId, "018f07a2-7b6c-7d85-a2de-89efb6c124e1");
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

test("subtask draft validates input before reserving usage", async () => {
  let reserved = false;
  const response = await request(createIsolatedAiApp({
    reserveRequest: async () => {
      reserved = true;
      return { allowed: false };
    },
  })).post("/api/ai/subtask-draft").send({ title: "   " });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AI_SUBTASK_REQUEST_INVALID");
  assert.equal(reserved, false);
});

test("subtask draft enforces shared limit without calling provider", async () => {
  let providerCalled = false;
  const response = await request(createIsolatedAiApp({
    reserveRequest: async () => ({ allowed: false, limit: { limit: 70, remaining: 0, resetAt: null } }),
    generateSubtaskDraft: async () => {
      providerCalled = true;
      return [];
    },
  })).post("/api/ai/subtask-draft").send({ title: "Подготовить запуск" });

  assert.equal(response.status, 429);
  assert.equal(providerCalled, false);
  assert.equal(response.body.limit.remaining, 0);
});

test("subtask draft returns validated steps without mutating tasks", async () => {
  let taskMutation = false;
  const response = await request(createIsolatedAiApp({
    db: {
      task: { findMany: async () => [], create: async () => { taskMutation = true; } },
      user: { findUnique: async () => ({ currentEnergy: 50, aiTone: "calm" }) },
    },
    reserveRequest: async () => ({ allowed: true, reservation: { userId: 42, cost: 1, resetAt: null }, limit: { limit: 70, remaining: 69, resetAt: null } }),
    generateSubtaskDraft: async () => [{ title: "Собрать требования" }, { title: "Проверить сценарий" }],
  })).post("/api/ai/subtask-draft").send({ title: "Подготовить запуск", priority: "⚡️ P2", energyLevel: "med" });

  assert.equal(response.status, 200);
  assert.equal(response.body.subtasks.length, 2);
  assert.equal(taskMutation, false);
});

test("subtask draft releases reservation after provider failure", async () => {
  const token = { userId: 42, cost: 1, resetAt: null };
  let released: unknown;
  const response = await request(createIsolatedAiApp({
    reserveRequest: async () => ({ allowed: true, reservation: token, limit: { limit: 70, remaining: 69, resetAt: null } }),
    releaseRequest: async (reservation: unknown) => { released = reservation; return { released: true, limit: { limit: 70, remaining: 70, resetAt: null } }; },
    generateSubtaskDraft: async () => { throw Object.assign(new Error("timeout"), { code: "AI_PROVIDER_TIMEOUT" }); },
  })).post("/api/ai/subtask-draft").send({ title: "Подготовить запуск" });

  assert.equal(response.status, 503);
  assert.deepEqual(released, token);
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
