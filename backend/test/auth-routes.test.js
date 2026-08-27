import assert from "node:assert/strict";
import express from "express";
import bcrypt from "bcryptjs";
import test from "node:test";
import request from "supertest";
import { createAuthRouter } from "../routes/auth.routes.js";

process.env.JWT_SECRET = "auth-route-test-secret";

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

const createApp = (db, authenticate = (req, _res, next) => {
  req.user = { id: 42 };
  next();
}) => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", createAuthRouter({ db, authenticate }));
  return app;
};

test("ordinary register keeps the safe DTO and 30-day cookie contract", async () => {
  const app = createApp({
    user: {
      findUnique: async () => null,
      create: async ({ data }) => ({ ...baseUser, ...data }),
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
  assert.match(response.headers["set-cookie"][0], /glowy_token=/);
  assert.match(response.headers["set-cookie"][0], /Max-Age=2592000/);
});

test("ordinary login, me and logout remain compatible", async () => {
  const app = createApp({
    user: {
      findUnique: async ({ select }) =>
        select
          ? Object.fromEntries(Object.keys(select).map((key) => [key, baseUser[key]]))
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
  assert.match(logout.headers["set-cookie"][0], /glowy_token=;/);
});
