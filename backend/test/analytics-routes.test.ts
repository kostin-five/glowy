import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import type { RequestHandler } from "express";
import { createAnalyticsRouter } from "../routes/analytics.routes.js";
import type { AnalyticsSnapshot } from "../services/analytics/analytics.service.js";
import type { AiReservation } from "../services/ai/ai-limits.service.js";

interface AnalyticsFixtureOptions {
  snapshot?: AnalyticsSnapshot;
  onReserve?: (input: { userId: number; cost: number }) => void;
  onGenerate?: () => void;
  onRelease?: (reservation: AiReservation) => void;
  reservationAllowed?: boolean;
  generateError?: unknown;
}

const createApp = ({
  snapshot,
  onReserve,
  onGenerate,
  onRelease,
  reservationAllowed = true,
  generateError,
}: AnalyticsFixtureOptions = {}) => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/analytics",
    createAnalyticsRouter({
      db: {
        user: { findUnique: async () => ({ aiTone: "calm" }) },
      },
      authenticate: ((req, _res, next) => {
        req.user = { id: 42 };
        next();
      }) satisfies RequestHandler,
      loadSnapshot: async () => snapshot,
      reserveRequest: async (userId: number, cost = 1) => {
        onReserve?.({ userId, cost });
        return {
          allowed: reservationAllowed,
          reservation: reservationAllowed
            ? { userId, cost, resetAt: "2026-08-17T00:00:00.000Z" }
            : undefined,
          limit: { limit: 70, remaining: reservationAllowed ? 65 : 0, resetAt: "2026-08-17T00:00:00.000Z" },
        };
      },
      generateInsight: async () => {
        onGenerate?.();
        if (generateError) throw generateError;
        return { text: "Короткий вывод" };
      },
      releaseRequest: async (reservation: AiReservation) => {
        onRelease?.(reservation);
        return { released: true };
      },
    } as never)
  );
  return app;
};

const baseSnapshot: AnalyticsSnapshot = {
  period: { kind: "week", from: "2026-08-10", to: "2026-08-16" },
  completedTasks: 1,
  dailyCompleted: [],
  energyDistribution: { low: 1, med: 0, high: 0 },
  taskStreak: 1,
  time: {
    estimatedMinutes: 0,
    actualMinutes: 0,
    tasksWithEstimate: 0,
    tasksWithActual: 0,
  },
  hasActivity: true,
  canUseFocusFeatures: true,
  focusBetaAvailable: true,
  focusBetaEnabled: true,
  canRequestAiInsight: true,
};

test("rejects Start analytics insight before limit or provider calls", async () => {
  let touched = false;
  const response = await request(
    createApp({
      snapshot: { ...baseSnapshot, canUseFocusFeatures: false },
      onReserve: () => { touched = true; },
      onGenerate: () => { touched = true; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 403);
  assert.equal(touched, false);
});

test("does not consume AI usage for an empty analytics period", async () => {
  let reserved = false;
  const response = await request(
    createApp({
      snapshot: { ...baseSnapshot, hasActivity: false },
      onReserve: () => { reserved = true; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 422);
  assert.equal(reserved, false);
});

test("returns weekly premium insight after reserving five requests", async () => {
  let generated = 0;
  let requestedCost: number | undefined;
  const response = await request(
    createApp({
      snapshot: baseSnapshot,
      onGenerate: () => { generated += 1; },
      onReserve: ({ cost }) => { requestedCost = cost; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 200);
  assert.equal(response.body.insight, "Короткий вывод");
  assert.equal(response.body.cost, 5);
  assert.equal(generated, 1);
  assert.equal(requestedCost, 5);
});

test("monthly premium insight costs ten requests", async () => {
  let requestedCost: number | undefined;
  const response = await request(
    createApp({
      snapshot: {
        ...baseSnapshot,
        period: { kind: "month", from: "2026-08-01", to: "2026-08-31" },
      },
      onReserve: ({ cost }) => { requestedCost = cost; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "month", anchor: "2026-08-16" });

  assert.equal(response.status, 200);
  assert.equal(response.body.cost, 10);
  assert.equal(requestedCost, 10);
});

test("denied analytics reservation skips the provider", async () => {
  let generated = false;
  const response = await request(
    createApp({
      snapshot: baseSnapshot,
      reservationAllowed: false,
      onGenerate: () => { generated = true; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 429);
  assert.equal(generated, false);
});

test("analytics provider failure releases the reservation", async () => {
  let released: AiReservation | undefined;
  const response = await request(
    createApp({
      snapshot: baseSnapshot,
      generateError: new Error("provider unavailable"),
      onRelease: (reservation) => { released = reservation; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 503);
  assert.deepEqual(released, {
    userId: 42,
    cost: 5,
    resetAt: "2026-08-17T00:00:00.000Z",
  });
});
