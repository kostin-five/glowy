import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import test from "node:test";
import request from "supertest";
import { createUserRouter } from "../routes/user.routes.js";

const secret = "user-telegram-test-secret";

const createFixture = (telegramLinks: unknown) => {
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use(express.json());
  app.use(
    "/api/user",
    createUserRouter({
      db: {},
      telegramLinks,
    } as never)
  );
  return {
    app,
    authorization: `Bearer ${jwt.sign({ id: 42 }, secret)}`,
  };
};

test("telegram settings endpoints require the existing authenticated user", async () => {
  const { app } = createFixture({});
  const response = await request(app).get("/api/user/telegram");
  assert.equal(response.status, 401);
});

test("returns safe Telegram status and a one-time link response", async () => {
  const calls: number[] = [];
  const { app, authorization } = createFixture({
    getStatus: async (userId: number) => ({
      available: true,
      botUsername: "glowy_test_bot",
      connected: false,
      connectedAt: null,
      userId,
    }),
    createCode: async (userId: number) => {
      calls.push(userId);
      return {
        code: "Abcd1234_-xy",
        expiresAt: new Date("2026-08-26T20:10:00.000Z"),
        deepLink: "https://t.me/glowy_test_bot?start=Abcd1234_-xy",
      };
    },
  });

  const status = await request(app)
    .get("/api/user/telegram")
    .set("Authorization", authorization);
  const code = await request(app)
    .post("/api/user/telegram/link-code")
    .set("Authorization", authorization);

  assert.equal(status.status, 200);
  assert.equal(status.body.connected, false);
  assert.equal(status.body.telegramUserId, undefined);
  assert.equal(code.status, 201);
  assert.deepEqual(calls, [42]);
});

test("unlinks only the authenticated Glowy user", async () => {
  const calls: number[] = [];
  const { app, authorization } = createFixture({
    unlinkUser: async (userId: number) => { calls.push(userId); return { ok: true }; },
  });
  const response = await request(app)
    .delete("/api/user/telegram")
    .set("Authorization", authorization);

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [42]);
});
