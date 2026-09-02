import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import test from "node:test";
import request from "supertest";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";

const secret = "telegram-middleware-secret";

const createApp = (connection: { id: number } | null) => {
  const app = express();
  app.get(
    "/protected",
    createAuthMiddleware({
      jwtSecret: secret,
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
