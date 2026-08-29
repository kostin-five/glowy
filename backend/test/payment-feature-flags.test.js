import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../app.js";

const originalFetch = global.fetch;
const originalJwtSecret = process.env.JWT_SECRET;
const originalForeverFlag = process.env.PAID_FOREVER_ENABLED;

test.afterEach(() => {
  global.fetch = originalFetch;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalForeverFlag === undefined) delete process.env.PAID_FOREVER_ENABLED;
  else process.env.PAID_FOREVER_ENABLED = originalForeverFlag;
});

const createAuthHeader = () => {
  process.env.JWT_SECRET = "payment-feature-flag-test-secret";
  return `Bearer ${jwt.sign({ id: 42 }, process.env.JWT_SECRET)}`;
};

test("disabled paid Forever returns before database or YooKassa work", async () => {
  delete process.env.PAID_FOREVER_ENABLED;
  global.fetch = async () => {
    throw new Error("YooKassa must not be called");
  };

  const response = await request(createApp())
    .post("/api/payments/forever/create")
    .set("Origin", "http://localhost:5173")
    .set("Authorization", createAuthHeader());

  assert.equal(response.status, 403);
  assert.equal(response.body.code, "PAID_FOREVER_DISABLED");
});

test("legacy free Forever activation is gone before database work", async () => {
  const response = await request(createApp())
    .post("/api/payments/forever/activate")
    .set("Origin", "http://localhost:5173")
    .set("Authorization", createAuthHeader());

  assert.equal(response.status, 410);
  assert.equal(response.body.code, "PLAN_UNAVAILABLE");
  assert.equal(response.body.error, "Бесплатная активация Forever больше недоступна");
});
