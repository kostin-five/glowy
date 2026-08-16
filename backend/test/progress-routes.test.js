import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import {
  buildProgressOverview,
  createProgressRouter,
} from "../routes/progress.routes.js";

const createApp = (db) => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/progress",
    createProgressRouter({
      db,
      authenticate: (req, _res, next) => {
        req.user = { id: 42 };
        next();
      },
    })
  );
  return app;
};

test("rejects malformed progress dates before database access", async () => {
  let touched = false;
  const response = await request(
    createApp({
      user: {
        findUnique: async () => {
          touched = true;
          return null;
        },
      },
    })
  ).get("/api/progress?today=16.08.2026");

  assert.equal(response.status, 400);
  assert.equal(touched, false);
});

test("creates a trimmed habit for the authenticated user", async () => {
  let createdData;
  const createdHabit = {
    id: 7,
    userId: 42,
    title: "Прогулка после обеда",
    archived: false,
    checks: [],
    createdAt: new Date("2026-08-16T08:00:00.000Z"),
    updatedAt: new Date("2026-08-16T08:00:00.000Z"),
  };
  const response = await request(
    createApp({
      habit: {
        create: async ({ data }) => {
          createdData = data;
          return createdHabit;
        },
      },
    })
  )
    .post("/api/progress/habits")
    .send({ title: "  Прогулка после обеда  ", today: "2026-08-16" });

  assert.equal(response.status, 201);
  assert.deepEqual(createdData, {
    userId: 42,
    title: "Прогулка после обеда",
  });
  assert.equal(response.body.title, "Прогулка после обеда");
  assert.equal(response.body.checkedToday, false);
  assert.equal(response.body.currentStreak, 0);
});

test("resets the monthly rescue allowance at a month boundary", async () => {
  const overview = await buildProgressOverview({
    db: {
      user: {
        findUnique: async () => ({
          xp: 120,
          level: 2,
          plan: "focus",
          subscriptionStatus: "active",
          planExpiresAt: new Date("2026-09-01T00:00:00.000Z"),
        }),
      },
      task: {
        findMany: async () => [],
      },
      streakRescue: {
        findMany: async () => [
          { protectedOn: "2026-07-02" },
          { protectedOn: "2026-07-09" },
          { protectedOn: "2026-07-18" },
          { protectedOn: "2026-08-04" },
        ],
      },
      habit: {
        findMany: async () => [],
        count: async () => 0,
      },
      achievement: {
        findMany: async () => [],
      },
    },
    userId: 42,
    today: "2026-08-16",
  });

  assert.deepEqual(overview.rescues, {
    remaining: 2,
    monthlyLimit: 3,
    usedDates: ["2026-08-04"],
  });
});

test("returns task streak to Start users", async () => {
  const overview = await buildProgressOverview({
    db: {
      user: {
        findUnique: async () => ({
          xp: 0,
          level: 1,
          plan: "start",
          subscriptionStatus: "inactive",
          planExpiresAt: null,
        }),
      },
      task: {
        findMany: async () => [
          { completedOn: "2026-08-15" },
          { completedOn: "2026-08-16" },
        ],
      },
      streakRescue: { findMany: async () => [] },
      habit: {
        findMany: async () => [],
        count: async () => 0,
      },
      achievement: {
        createMany: async () => ({ count: 0 }),
        findMany: async () => [],
      },
    },
    userId: 42,
    today: "2026-08-16",
  });

  assert.equal(overview.canUseFocusFeatures, false);
  assert.equal(overview.taskStreak.current, 2);
  assert.deepEqual(overview.taskStreak.days, ["2026-08-15", "2026-08-16"]);
});

test("rejects a duplicate rescue without creating another record", async () => {
  let createCalled = false;
  const response = await request(
    createApp({
      user: {
        findUnique: async () => ({
          plan: "forever",
          subscriptionStatus: "active",
          planExpiresAt: null,
        }),
      },
      $transaction: async (callback) =>
        callback({
          streakRescue: {
            findUnique: async () => ({ id: 3 }),
            create: async () => {
              createCalled = true;
            },
          },
        }),
    })
  )
    .post("/api/progress/rescues")
    .send({ protectedOn: "2026-08-15", today: "2026-08-16" });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, "Этот день уже защищен");
  assert.equal(createCalled, false);
});
