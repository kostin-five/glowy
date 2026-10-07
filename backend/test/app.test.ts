import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import request from "supertest";
import express from "express";
import type { Response as SupertestResponse } from "supertest";
import { createApp } from "../app.js";

const require = createRequire(import.meta.url);
const proxyAddr = require("proxy-addr") as {
  compile(subnet: string): (address: string) => boolean;
};

test("IPv4-mapped IPv6 trust must not accept an unrelated IPv4 address", () => {
  // Regression for GHSA-jqcg-44mw-7w3h; synthetic addresses only.
  assert.equal(proxyAddr.compile("::ffff:10.0.0.0/8")("203.0.113.10"), false);
  const trust = proxyAddr.compile("::ffff:10.0.0.0/104");
  assert.equal(trust("10.1.2.3"), true);
  assert.equal(trust("203.0.113.10"), false);
});

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

test("malformed and oversized JSON use safe errors", async () => {
  for (const [body, status, code] of [["{SENTINEL_SECRET", 400, "REQUEST_JSON_INVALID"], [JSON.stringify({ text: "SENTINEL".repeat(20_000) }), 413, "REQUEST_TOO_LARGE"]] as const) {
    const response = await request(createApp()).post("/api/auth/login").set("Origin", allowedOrigins[0]!).set("Content-Type", "application/json").send(body);
    assert.equal(response.status, status);
    assert.equal(response.body.code, code);
    assert.doesNotMatch(JSON.stringify(response.body), /SENTINEL/);
  }
});

test("production configuration rejects wildcard origins, excessive proxies and test routes", async () => {
  const before = { NODE_ENV: process.env.NODE_ENV, CORS_ORIGINS: process.env.CORS_ORIGINS, TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS };
  try {
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGINS = "https://example.test";
    process.env.TRUST_PROXY_HOPS = "0";
    const response = await request(createApp({ testRoute: true })).get("/api/__test__/error").set("X-Forwarded-For", "203.0.113.1");
    assert.equal(response.status, 404);
    assert.equal(response.headers["x-powered-by"], undefined);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    process.env.CORS_ORIGINS = "https://*.example.test";
    assert.throws(() => createApp());
    process.env.CORS_ORIGINS = "https://example.test";
    process.env.TRUST_PROXY_HOPS = "99";
    assert.throws(() => createApp());
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
