import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import test from "node:test";
import request from "supertest";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { getAuthSecret, isAuthTokenRevoked, revokeAuthToken, tokenFingerprint } from "../services/auth/auth-session.service.js";
import { createAuthRouter } from "../routes/auth.routes.js";

const secret = "telegram-middleware-secret";

test("weak production secrets are rejected", () => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.throws(() => getAuthSecret("short"));
    assert.throws(() => getAuthSecret("change-me-".repeat(8)));
    assert.equal(getAuthSecret("a-synthetic-random-test-secret-0123456789").length > 32, true);
  } finally { if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before; }
});

test("logout persists only a fingerprint and a new middleware rejects the session", async () => {
  const records = new Map<string, unknown>();
  const db = { revokedToken: {
    findUnique: async ({ where }: { where: { fingerprint: string } }) => records.get(where.fingerprint) || null,
    upsert: async ({ where, create }: { where: { fingerprint: string }; create: unknown }) => records.set(where.fingerprint, create),
    deleteMany: async () => ({ count: 0 }),
  } };
  const token = jwt.sign({ id: 42 }, secret, { expiresIn: "24h" });
  const app = express();
  app.use("/auth", createAuthRouter({ revokeToken: (value) => revokeAuthToken(value, db as never, secret) }));
  const response = await request(app).post("/auth/logout").set("Authorization", `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(records.has(tokenFingerprint(token)), true);
  assert.equal(JSON.stringify([...records]).includes(token), false);
  const restarted = express();
  restarted.get("/protected", createAuthMiddleware({ jwtSecret: secret, isRevoked: (value) => isAuthTokenRevoked(value, db as never) }), (_req, res) => res.sendStatus(200));
  assert.equal((await request(restarted).get("/protected").set("Authorization", `Bearer ${token}`)).status, 401);
});

test("unsupported algorithms, bearer schemes and invalid user identifiers are rejected", async () => {
  for (const header of [
    `Basic ${jwt.sign({ id: 42 }, secret)}`,
    `Bearer ${jwt.sign({ id: 42 }, secret, { algorithm: "HS384" })}`,
    `Bearer ${jwt.sign({ id: -1 }, secret)}`,
    `Bearer ${jwt.sign({ id: "42" }, secret)}`,
  ]) {
    assert.equal((await request(createApp(null)).get("/protected").set("Authorization", header)).status, 401);
  }
});

const createApp = (connection: { id: number } | null) => {
  const app = express();
  app.get(
    "/protected",
    createAuthMiddleware({
      jwtSecret: secret,
      isRevoked: async () => false,
      db: { telegramConnection: { findFirst: async () => connection } },
    } as never),
    (req, res) => res.json({ id: req.user.id })
  );
  return app;
};

test("accepts a Telegram-bound token only while its connection exists", async () => {
  const token = jwt.sign(
    { id: 42, channel: "telegram-mini-app", telegramConnectionId: 5 },
    secret,
    { expiresIn: "24h" }
  );
  const active = await request(createApp({ id: 5 }))
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);
  const revoked = await request(createApp(null))
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(active.status, 200);
  assert.equal(revoked.status, 401);
});

test("ordinary web token does not require a Telegram lookup", async () => {
  const token = jwt.sign({ id: 42 }, secret, { expiresIn: "30d" });
  const response = await request(createApp(null))
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(response.status, 200);
});
