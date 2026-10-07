import assert from "node:assert/strict";
import express from "express";
import test from "node:test";
import request from "supertest";
import { createTelegramRouter } from "../routes/telegram.routes.js";
import { TelegramMiniAppSessionError } from "../services/telegram/telegram-mini-app-session.service.js";

process.env.JWT_SECRET = "telegram-mini-app-route-secret";
process.env.REGISTRATION_ENABLED = "true";
process.env.TELEGRAM_MINI_APP_SESSION_HOURS = "24";

const result = {
  connectionId: 5,
  user: {
    id: 42,
    name: "Тест",
    email: "test@example.com",
    xp: 0,
    level: 1,
    avatarId: null,
    aiTone: "calm",
  },
};

const createApp = (miniAppSessions: unknown) => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/telegram",
    createTelegramRouter({
      db: { telegramWebhookUpdate: {} },
      webhookSecret: "test-webhook-secret",
      miniAppSessions,
    } as never)
  );
  return app;
};

test("restores a warmed Mini App session under three seconds with a 24-hour cookie", async () => {
  const startedAt = performance.now();
  const response = await request(
    createApp({ restore: async () => result })
  ).post("/api/telegram/mini-app/session").send({ initData: "signed" });
  assert.equal(response.status, 200);
  assert.ok(performance.now() - startedAt < 3000);
  assert.match(response.headers["set-cookie"]![0]!, /Max-Age=86400/);
  assert.match(response.headers["server-timing"]!, /telegram-session;dur=/);
  assert.equal(response.body.password, undefined);
});

test("caps an oversized Telegram session configuration at 24 hours", async () => {
  process.env.TELEGRAM_MINI_APP_SESSION_HOURS = "72";
  try {
    const response = await request(
      createApp({ restore: async () => result })
    ).post("/api/telegram/mini-app/session").send({ initData: "signed" });
    assert.equal(response.status, 200);
    assert.match(response.headers["set-cookie"]![0]!, /Max-Age=86400/);
  } finally {
    process.env.TELEGRAM_MINI_APP_SESSION_HOURS = "24";
  }
});

test("registers and logs in through the Mini App channel adapter", async () => {
  const calls: Array<[string, unknown]> = [];
  const app = createApp({
    register: async (input: unknown) => { calls.push(["register", input]); return result; },
    login: async (input: unknown) => { calls.push(["login", input]); return result; },
  });
  const registration = await request(app)
    .post("/api/telegram/mini-app/register")
    .send({ initData: "signed", name: "Тест", email: "test@example.com", password: "password1" });
  const login = await request(app)
    .post("/api/telegram/mini-app/login")
    .send({ initData: "signed", email: "test@example.com", password: "password1" });
  assert.equal(registration.status, 201);
  assert.equal(login.status, 200);
  assert.equal(calls.length, 2);
});

test("returns a controlled registration-required response without a cookie", async () => {
  const app = createApp({
    restore: async () => {
      throw new TelegramMiniAppSessionError(
        "TELEGRAM_REGISTRATION_REQUIRED",
        "Войдите или зарегистрируйтесь внутри Telegram Mini App"
      );
    },
  });
  const response = await request(app)
    .post("/api/telegram/mini-app/session")
    .send({ initData: "signed" });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, "TELEGRAM_REGISTRATION_REQUIRED");
  assert.equal(response.headers["set-cookie"], undefined);
});

test("returns a controlled connection conflict without exposing credentials", async () => {
  const app = createApp({
    login: async () => {
      throw new TelegramMiniAppSessionError(
        "TELEGRAM_LINK_CONFLICT",
        "Telegram или аккаунт Glowy уже связан с другим профилем"
      );
    },
  });
  const response = await request(app)
    .post("/api/telegram/mini-app/login")
    .send({ initData: "signed-private", email: "hidden@example.com", password: "private-password" });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, "TELEGRAM_LINK_CONFLICT");
  assert.equal(response.headers["set-cookie"], undefined);
  assert.equal(JSON.stringify(response.body).includes("private-password"), false);
  assert.equal(JSON.stringify(response.body).includes("signed-private"), false);
});

test("unexpected session errors stay generic and logs redact request input", async () => {
  const lines: string[] = [];
  const originalError = console.error;
  console.error = (line) => lines.push(String(line));
  try {
    const response = await request(createApp({
      restore: async () => { throw new Error("internal database detail"); },
    }))
      .post("/api/telegram/mini-app/session")
      .send({ initData: "signed-private-launch" });
    assert.equal(response.status, 500);
    assert.equal(response.body.code, "TELEGRAM_SESSION_FAILED");
    const output = lines.join("\n");
    assert.equal(output.includes("signed-private-launch"), false);
    assert.equal(output.includes("internal database detail"), false);
  } finally {
    console.error = originalError;
  }
});

test("closed Mini App registration never calls the session service and preserves login", async () => {
  let registrations = 0;
  const app = createApp({
    register: async () => { registrations++; return result; },
    login: async () => result,
  });
  process.env.REGISTRATION_ENABLED = "false";
  try {
    const response = await request(app).post("/api/telegram/mini-app/register").send({});
    assert.equal(response.status, 403);
    assert.equal(response.body.code, "AUTH_REGISTRATION_DISABLED");
    assert.equal(response.headers["set-cookie"], undefined);
    assert.equal(registrations, 0);
    const login = await request(app).post("/api/telegram/mini-app/login").send({});
    assert.equal(login.status, 200);
  } finally { process.env.REGISTRATION_ENABLED = "true"; }
});
