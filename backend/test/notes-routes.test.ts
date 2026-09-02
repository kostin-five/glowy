import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import type { RequestHandler } from "express";
import type { AiReservation } from "../services/ai/ai-limits.service.js";
import { createNotesRouter } from "../routes/notes.routes.js";

const createApp = (db: unknown, overrides: Record<string, unknown> = {}) => {
  const app = express();
  app.use(express.json());
  app.use("/api/notes", createNotesRouter({
    db,
    authenticate: ((req, _res, next) => { req.user = { id: 42 }; next(); }) satisfies RequestHandler,
    ...overrides,
  } as never));
  return app;
};

test("scopes note search to the authenticated owner", async () => {
  let receivedWhere: Record<string, unknown> | undefined;
  const response = await request(createApp({ note: { findMany: async ({ where }: { where: Record<string, unknown> }) => {
    receivedWhere = where; return [];
  } } })).get("/api/notes?query=План&archived=false");

  assert.equal(response.status, 200);
  assert.ok(receivedWhere);
  assert.equal(receivedWhere.userId, 42);
  assert.equal(receivedWhere.archived, false);
  const search = receivedWhere.OR as Array<{ title: { contains: string } }>;
  assert.equal(search[0]!.title.contains, "План");
});

test("returns an AI draft without creating a task", async () => {
  let transactionCalled = false;
  const response = await request(createApp({
    note: { findFirst: async () => ({ id: 3, content: "Нужно записаться к врачу" }) },
    $transaction: async () => { transactionCalled = true; },
  }, {
    reserveAiRequest: async () => ({
      allowed: true,
      reservation: { userId: 42, cost: 1, resetAt: "2026-09-01T12:00:00.000Z" },
      limit: { remaining: 9 },
    }),
    generateDraft: async () => ({ title: "Записаться к врачу", date: "", priority: "⚡️ P2", energyLevel: "med", category: "Здоровье" }),
  })).post("/api/notes/3/task-draft").send({ fragment: "записаться к врачу" });

  assert.equal(response.status, 200);
  assert.equal(response.body.draft.title, "Записаться к врачу");
  assert.equal(transactionCalled, false);
});

test("denied note AI reservation skips the provider", async () => {
  let generated = false;
  const response = await request(createApp({
    note: { findFirst: async () => ({ id: 3, content: "Нужно записаться к врачу" }) },
  }, {
    reserveAiRequest: async () => ({ allowed: false, limit: { remaining: 0 } }),
    generateDraft: async () => { generated = true; },
  })).post("/api/notes/3/task-draft").send({ fragment: "записаться к врачу" });

  assert.equal(response.status, 429);
  assert.equal(generated, false);
});

test("note AI provider failure releases the reservation", async () => {
  const token = { userId: 42, cost: 1, resetAt: "2026-09-01T12:00:00.000Z" };
  let released: AiReservation | undefined;
  const response = await request(createApp({
    note: { findFirst: async () => ({ id: 3, content: "Нужно записаться к врачу" }) },
  }, {
    reserveAiRequest: async () => ({ allowed: true, reservation: token, limit: { remaining: 9 } }),
    releaseAiRequest: async (reservation: AiReservation) => { released = reservation; },
    generateDraft: async () => {
      throw Object.assign(new Error("provider unavailable"), { code: "AI_PROVIDER_TIMEOUT" });
    },
  })).post("/api/notes/3/task-draft").send({ fragment: "записаться к врачу" });

  assert.equal(response.status, 503);
  assert.deepEqual(released, token);
});

test("creates one task and link in the confirmation transaction", async () => {
  let tasksCreated = 0;
  let linksCreated = 0;
  const response = await request(createApp({
    note: { findFirst: async () => ({ id: 3 }) },
    $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
      task: { create: async () => { tasksCreated += 1; return { id: 9, title: "Позвонить", date: "", priority: "⚡️ P2", energyLevel: "med", category: "Личное", completed: false, completedOn: null, xpAwarded: false, estimatedMinutes: null, actualMinutes: null, subtasks: [] }; } },
      noteTaskLink: { create: async () => { linksCreated += 1; return { id: 5, noteId: 3, taskId: 9 }; } },
    }),
  })).post("/api/notes/3/tasks").send({ title: "Позвонить", date: "", priority: "⚡️ P2", energyLevel: "med", category: "Личное" });

  assert.equal(response.status, 201);
  assert.equal(tasksCreated, 1);
  assert.equal(linksCreated, 1);
});

test("does not disclose a note outside the authenticated owner", async () => {
  const response = await request(createApp({ note: { findFirst: async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, { id: 77, userId: 42 });
    return null;
  } } })).get("/api/notes/77");

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Заметка не найдена" });
});

test("rejects an empty note before database access", async () => {
  let touched = false;
  const response = await request(createApp({ note: { create: async () => { touched = true; } } }))
    .post("/api/notes")
    .send({ title: "  ", content: "  " });

  assert.equal(response.status, 400);
  assert.equal(touched, false);
});

test("archives only an owned note", async () => {
  let updateData;
  const existing = { id: 4, userId: 42, title: "План", content: "Текст", archived: false };
  const response = await request(createApp({ note: {
    findFirst: async ({ where }: { where: unknown }) => {
      assert.deepEqual(where, { id: 4, userId: 42 });
      return existing;
    },
    update: async ({ data }: { data: Record<string, unknown> }) => {
      updateData = data;
      return { ...existing, ...data, taskLinks: [], createdAt: new Date(), updatedAt: new Date() };
    },
  } })).put("/api/notes/4").send({ archived: true });

  assert.equal(response.status, 200);
  assert.deepEqual(updateData, { archived: true });
});

test("rejects a link to a task outside the owner", async () => {
  let upserted = false;
  const response = await request(createApp({
    note: { findFirst: async () => ({ id: 4 }) },
    task: { findFirst: async () => null },
    noteTaskLink: { upsert: async () => { upserted = true; } },
  })).post("/api/notes/4/task-links").send({ taskId: 99 });

  assert.equal(response.status, 404);
  assert.equal(upserted, false);
});
