import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import request from "supertest";
import { createSubTaskRouter } from "../routes/subtask.routes.js";
import { createTaskRouter } from "../routes/task.routes.js";

const requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";
const authenticate = (req, _res, next) => {
  req.user = { id: 42 };
  next();
};
const task = {
  id: 7,
  userId: 42,
  title: "Подготовить отчёт",
  date: "2026-08-31",
  priority: "🔥 P1",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "high",
  estimatedMinutes: 60,
  actualMinutes: null,
  subtasks: [],
  noteLinks: [],
};

const createApp = ({ db, createTask } = {}) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.requestId = requestId;
    next();
  });
  app.use("/api/tasks", createTaskRouter({ db, authenticate, createTask }));
  app.use("/api/subtasks", createSubTaskRouter({ db, authenticate }));
  return app;
};

test("task list remains owner-scoped and parses the shared response", async () => {
  let where;
  const response = await request(createApp({
    db: {
      task: {
        findMany: async (query) => {
          where = query.where;
          return [task];
        },
      },
    },
  })).get("/api/tasks");

  assert.equal(response.status, 200);
  assert.deepEqual(where, { userId: 42 });
  assert.equal(response.body[0].id, 7);
});

test("invalid task input returns a stable request-ID error before creation", async () => {
  let created = false;
  const response = await request(createApp({
    db: {},
    createTask: async () => { created = true; },
  }))
    .post("/api/tasks")
    .send({ title: "", date: "31.08.2026" });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "TASK_INVALID_INPUT");
  assert.equal(response.body.requestId, requestId);
  assert.equal(created, false);
});

test("task update rejects a foreign owner before its transaction", async () => {
  let transactionCalled = false;
  const response = await request(createApp({
    db: {
      task: { findUnique: async () => ({ ...task, userId: 99 }) },
      $transaction: async () => { transactionCalled = true; },
    },
  }))
    .put("/api/tasks/7")
    .send({ title: "Новое название" });

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "TASK_FORBIDDEN");
  assert.equal(transactionCalled, false);
});

test("subtask creation validates ownership and returns the shared DTO", async () => {
  const response = await request(createApp({
    db: {
      task: { findFirst: async ({ where }) => where.userId === 42 ? task : null },
      subTask: {
        findFirst: async () => null,
        create: async ({ data }) => ({ id: 8, ...data }),
      },
    },
  }))
    .post("/api/subtasks")
    .send({ taskId: 7, title: "Собрать данные" });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    id: 8,
    taskId: 7,
    title: "Собрать данные",
    completed: false,
    position: 0,
  });
});
