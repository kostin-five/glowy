import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createAnalyticsRouter } from "../routes/analytics.routes.js";

const createApp = ({ snapshot, onLimit, onGenerate, onConsume } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/analytics",
    createAnalyticsRouter({
      db: {
        user: { findUnique: async () => ({ aiTone: "calm" }) },
      },
      authenticate: (req, _res, next) => {
        req.user = { id: 42 };
        next();
      },
      loadSnapshot: async () => snapshot,
      getRequestLimit: async (userId, cost) => {
        onLimit?.({ userId, cost });
        return {
          allowed: true,
          limit: { limit: 100, remaining: 100, resetAt: "2026-08-17T00:00:00.000Z" },
        };
      },
      generateInsight: async () => {
        onGenerate?.();
        return { text: "Короткий вывод" };
      },
      consumeRequest: async (userId, cost) => {
        onConsume?.({ userId, cost });
        return {
          limit: { limit: 100, remaining: 95, resetAt: "2026-08-17T00:00:00.000Z" },
        };
      },
    })
  );
  return app;
};

const baseSnapshot = {
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
      onLimit: () => { touched = true; },
      onGenerate: () => { touched = true; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 403);
  assert.equal(touched, false);
});

test("does not consume AI usage for an empty analytics period", async () => {
  let consumed = false;
  const response = await request(
    createApp({
      snapshot: { ...baseSnapshot, hasActivity: false },
      onConsume: () => { consumed = true; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 422);
  assert.equal(consumed, false);
});

test("returns weekly premium insight and consumes five requests", async () => {
  let generated = 0;
  let requestedCost;
  let consumedCost;
  const response = await request(
    createApp({
      snapshot: baseSnapshot,
      onGenerate: () => { generated += 1; },
      onLimit: ({ cost }) => { requestedCost = cost; },
      onConsume: ({ cost }) => { consumedCost = cost; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "week", anchor: "2026-08-16" });

  assert.equal(response.status, 200);
  assert.equal(response.body.insight, "Короткий вывод");
  assert.equal(response.body.cost, 5);
  assert.equal(generated, 1);
  assert.equal(requestedCost, 5);
  assert.equal(consumedCost, 5);
});

test("monthly premium insight costs ten requests", async () => {
  let requestedCost;
  let consumedCost;
  const response = await request(
    createApp({
      snapshot: {
        ...baseSnapshot,
        period: { kind: "month", from: "2026-08-01", to: "2026-08-31" },
      },
      onLimit: ({ cost }) => { requestedCost = cost; },
      onConsume: ({ cost }) => { consumedCost = cost; },
    })
  )
    .post("/api/analytics/insight")
    .send({ period: "month", anchor: "2026-08-16" });

  assert.equal(response.status, 200);
  assert.equal(response.body.cost, 10);
  assert.equal(requestedCost, 10);
  assert.equal(consumedCost, 10);
});
