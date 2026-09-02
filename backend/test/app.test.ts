import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import express from "express";
import type { Response as SupertestResponse } from "supertest";
import { createApp } from "../app.js";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

test("health-check returns service status and a request identifier", async () => {
  const app = createApp();
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    service: "glowy-backend",
  });
  assert.match(response.headers["x-request-id"]!, /^[\da-f-]{36}$/i);
  assert.equal(
    response.headers["cache-control"],
    "private, no-store, max-age=0, must-revalidate"
  );
  assert.equal(response.headers["cdn-cache-control"], "no-store");
  assert.equal(response.headers["vercel-cdn-cache-control"], "no-store");
  assert.equal(response.headers.etag, undefined);
});

test("rejects requests from an unapproved origin before routes run", async () => {
  const app = createApp();
  const response = await request(app)
    .get("/api/health")
    .set("Origin", "https://untrusted.example");

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { error: "Доступ запрещен" });
});

test("allows supported local frontend origins", async () => {
  const app = createApp();

  for (const origin of allowedOrigins) {
    const response = await request(app).get("/api/health").set("Origin", origin);

    assert.equal(response.status, 200);
    assert.equal(response.headers["access-control-allow-origin"], origin);
  }
});

test("returns a generic response for an unhandled server error", async () => {
  const app = createApp({ testRoute: true });
  const response = await request(app).get("/api/__test__/error");

  assert.equal(response.status, 500);
  assert.equal(
    response.body.error,
    "Внутренняя ошибка сервера. Попробуйте ещё раз позже."
  );
  assert.equal(response.body.code, "INTERNAL_SERVER_ERROR");
  assert.equal(response.body.requestId, response.headers["x-request-id"]);
  assert.match(response.headers["x-request-id"]!, /^[\da-f-]{36}$/i);
});

test("completion log correlates route, status and request identifier", async () => {
  const originalConsoleLog = console.log;
  const records: Array<Record<string, unknown>> = [];
  console.log = (line) => records.push(JSON.parse(String(line)) as Record<string, unknown>);

  let response: SupertestResponse | undefined;
  try {
    response = await request(createApp()).get("/api/health");
  } finally {
    console.log = originalConsoleLog;
  }

  const completed = records.find((record) => record.event === "request.completed");
  assert.ok(completed);
  assert.ok(response);
  assert.equal(completed.requestId, response.headers["x-request-id"]);
  assert.equal(completed.method, "GET");
  assert.equal(completed.route, "/api/health");
  assert.equal(completed.statusCode, 200);
  assert.equal(Number.isFinite(completed.durationMs), true);
});

test("browser CSRF bypass remains limited to the exact Telegram webhook", async () => {
  const telegramRouter = express.Router();
  telegramRouter.post("/webhook", (_req, res) => res.json({ ok: true }));
  telegramRouter.post("/mini-app/session", (_req, res) => res.json({ ok: true }));
  const app = createApp({ telegramRouter });

  const webhook = await request(app).post("/api/telegram/webhook").send({});
  const miniApp = await request(app).post("/api/telegram/mini-app/session").send({});

  assert.equal(webhook.status, 200);
  assert.equal(miniApp.status, 403);
});
