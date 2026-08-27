import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import request from "supertest";
import { createTelegramRouter } from "../routes/telegram.routes.js";

const createTestApp = ({ db, secret = "telegram-test-secret", notifyWorker } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/telegram",
    createTelegramRouter({ db, webhookSecret: secret, notifyWorker })
  );
  return app;
};

test("telegram webhook rejects a missing or wrong secret", async () => {
  let writes = 0;
  const db = { telegramWebhookUpdate: { upsert: async () => { writes += 1; } } };
  const app = createTestApp({ db });

  const missing = await request(app).post("/api/telegram/webhook").send({ update_id: 1, message: {} });
  const wrong = await request(app)
    .post("/api/telegram/webhook")
    .set("X-Telegram-Bot-Api-Secret-Token", "wrong")
    .send({ update_id: 1, message: {} });

  assert.equal(missing.status, 401);
  assert.equal(wrong.status, 401);
  assert.equal(writes, 0);
});

test("telegram webhook validates a supported update", async () => {
  let writes = 0;
  const app = createTestApp({
    db: { telegramWebhookUpdate: { upsert: async () => { writes += 1; } } },
  });
  const response = await request(app)
    .post("/api/telegram/webhook")
    .set("X-Telegram-Bot-Api-Secret-Token", "telegram-test-secret")
    .send({ update_id: "unsafe", message: {} });

  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});

test("telegram webhook upserts duplicates and notifies only after persistence", async () => {
  const events = [];
  const db = {
    telegramWebhookUpdate: {
      upsert: async ({ where, create, update }) => {
        events.push(["upsert", where.updateId, create.status, update]);
      },
    },
  };
  const app = createTestApp({ db, notifyWorker: () => events.push(["notify"]) });
  const payload = { update_id: 123, message: { text: "/start" } };

  for (let index = 0; index < 2; index += 1) {
    const response = await request(app)
      .post("/api/telegram/webhook")
      .set("X-Telegram-Bot-Api-Secret-Token", "telegram-test-secret")
      .send(payload);
    assert.equal(response.status, 200);
  }

  assert.deepEqual(events, [
    ["upsert", "123", "PENDING", {}],
    ["notify"],
    ["upsert", "123", "PENDING", {}],
    ["notify"],
  ]);
});
