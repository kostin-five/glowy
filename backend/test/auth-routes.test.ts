import assert from "node:assert/strict";
import express from "express";
import bcrypt from "bcryptjs";
import test from "node:test";
import request from "supertest";
import type { RequestHandler } from "express";
import { createAuthRouter } from "../routes/auth.routes.js";

process.env.JWT_SECRET = "auth-route-test-secret";
process.env.REGISTRATION_ENABLED = "true";

const baseUser = {
  id: 42,
  name: "Тест",
  email: "test@example.com",
  password: bcrypt.hashSync("password1", 4),
  xp: 0,
  level: 1,
  avatarId: null,
  aiTone: "calm",
};

const createApp = (db: unknown, authenticate: RequestHandler = (req, _res, next) => {
  req.user = { id: 42 };
  next();
}) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";
    next();
  });
  app.use("/api/auth", createAuthRouter({ db, authenticate } as never));
  return app;
};

test("ordinary register keeps the safe DTO and one-day cookie contract", async () => {
  const app = createApp({
    user: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({ ...baseUser, ...data }),
    },
  });
  const response = await request(app).post("/api/auth/register").send({
    name: "Тест",
    email: "TEST@example.com",
    password: "password1",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.email, "test@example.com");
  assert.equal(response.body.password, undefined);
  assert.match(response.headers["set-cookie"]![0]!, /glowy_token=/);
  assert.match(response.headers["set-cookie"]![0]!, /Max-Age=86400/);
});

test("ordinary login, me and logout remain compatible", async () => {
  const app = createApp({
    user: {
      findUnique: async ({ select }: { select?: Record<string, boolean> }) =>
        select
          ? Object.fromEntries(Object.keys(select).map((key) => [key, baseUser[key as keyof typeof baseUser]]))
          : baseUser,
    },
  });
  const login = await request(app).post("/api/auth/login").send({
    email: baseUser.email,
    password: "password1",
  });
  const me = await request(app).get("/api/auth/me");
  const logout = await request(app).post("/api/auth/logout");
  assert.equal(login.status, 200);
  assert.equal(me.status, 200);
  assert.equal(me.body.password, undefined);
  assert.match(logout.headers["set-cookie"]![0]!, /glowy_token=;/);
});

test("invalid registration returns an additive safe contract error", async () => {
  const response = await request(createApp({ user: {} }))
    .post("/api/auth/register")
    .send({ name: "", email: "invalid", password: "short" });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, "AUTH_INVALID_INPUT");
  assert.equal(response.body.requestId, "018f07a2-7b6c-7d85-a2de-89efb6c124e1");
  assert.equal(JSON.stringify(response.body).includes("short"), false);
});

test("duplicate registration uses a generic error without exposing the supplied email", async () => {
  const response = await request(createApp({ user: { findUnique: async () => baseUser } }))
    .post("/api/auth/register").send({ name: "Тест", email: "duplicate@example.test", password: "password1" });
  assert.equal(response.body.code, "AUTH_REGISTRATION_REJECTED");
  assert.doesNotMatch(JSON.stringify(response.body), /duplicate@example/);
});

test("rotating emails cannot bypass the overall login IP limit", async () => {
  const app = createApp({ user: { findUnique: async () => null } });
  let limited = false;
  for (let i = 0; i < 31; i++) {
    const response = await request(app).post("/api/auth/login").set("X-Forwarded-For", `203.0.113.${i + 1}`).send({ email: `synthetic${i}@example.test`, password: "password1" });
    if (response.status === 429) { limited = true; break; }
    assert.equal(response.status, 400);
  }
  assert.equal(limited, true);
});

test("closed registration rejects all inputs before database access", async () => {
  let calls = 0;
  const app = createApp({ user: {
    findUnique: async () => { calls++; return baseUser; },
    create: async () => { calls++; return baseUser; },
  } });
  const before = process.env.REGISTRATION_ENABLED;
  try {
    for (const flag of [undefined, "false", "invalid"]) {
      if (flag === undefined) delete process.env.REGISTRATION_ENABLED;
      else process.env.REGISTRATION_ENABLED = flag;
      for (const email of [baseUser.email, "new@example.test", "invalid"]) {
        const response = await request(app).post("/api/auth/register").send({ email });
        assert.equal(response.status, 403);
        assert.equal(response.body.code, "AUTH_REGISTRATION_DISABLED");
        assert.equal(response.headers["set-cookie"], undefined);
      }
    }
    assert.equal(calls, 0);
  } finally { process.env.REGISTRATION_ENABLED = before; }
});
