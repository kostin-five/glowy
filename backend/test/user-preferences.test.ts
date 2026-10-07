import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createUserRouter } from "../routes/user.routes.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import bcrypt from "bcryptjs";

const originalJwtSecret = process.env.JWT_SECRET;

test.afterEach(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

const createFixture = (overrides: Record<string, unknown> = {}) => {
  let user: { id: number } & Record<string, unknown> = {
    id: 7,
    avatarId: null,
    aiTone: "calm",
    focusBetaEnabled: false,
    plan: "start",
    subscriptionStatus: "inactive",
    planExpiresAt: null,
    ...overrides,
  };
  const db = {
    user: {
      findUnique: async () => user,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        user = { ...user, ...data };
        return user;
      },
      delete: async () => user,
    },
  };
  const app = express();
  app.use(express.json());
  app.use("/api/user", createUserRouter({ db, authenticate: createAuthMiddleware({ isRevoked: async () => false }) } as never));

  process.env.JWT_SECRET = "user-preferences-test-secret";
  const authorization = `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET)}`;

  return { app, authorization };
};

test("returns safe defaults for a legacy profile", async () => {
  const { app, authorization } = createFixture({
    avatarId: "removed-avatar",
    aiTone: "unknown",
  });
  const response = await request(app)
    .get("/api/user/preferences")
    .set("Authorization", authorization);

  assert.equal(response.status, 200);
  assert.equal(response.body.avatarId, "orbit-indigo");
  assert.equal(response.body.aiTone, "calm");
  assert.equal(response.body.canUseFocusFeatures, false);
});

test("energy responses never include credential or profile fields", async () => {
  const { app, authorization } = createFixture({ password: "SENTINEL_HASH", email: "synthetic@example.test" });
  const response = await request(app).put("/api/user/energy").set("Authorization", authorization).send({ currentEnergy: 60 });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { currentEnergy: 60 });
  assert.doesNotMatch(JSON.stringify(response.body), /SENTINEL_HASH|synthetic/);
});

test("account removal requires its password even for a Telegram-bound session", async () => {
  for (const channel of [undefined, "telegram-mini-app"]) {
    let deleted = false;
    const app = express();
    app.use(express.json());
    app.use(createUserRouter({
      db: { user: {
        findUnique: async () => ({ id: 7, password: await bcrypt.hash("synthetic-password", 4) }),
        delete: async ({ where }: { where: { id: number } }) => { assert.equal(where.id, 7); deleted = true; },
      } },
      authenticate: ((req, _res, next) => { req.user = { id: 7, ...(channel ? { channel, telegramConnectionId: 5 } : {}) }; next(); }) satisfies RequestHandler,
    } as never));
    assert.equal((await request(app).delete("/account").send({ password: "wrong-password" })).status, 403);
    assert.equal(deleted, false);
    assert.equal((await request(app).delete("/account").send({ password: "synthetic-password" })).status, 200);
    assert.equal(deleted, true);
  }
});

test("updates a prepared avatar and respectful communication tone", async () => {
  const { app, authorization } = createFixture({
    plan: "focus",
    subscriptionStatus: "active",
    planExpiresAt: new Date("2099-09-01T00:00:00.000Z"),
  });
  const response = await request(app)
    .patch("/api/user/preferences")
    .set("Authorization", authorization)
    .send({ avatarId: "orbit-mint", aiTone: "strict" });

  assert.equal(response.status, 200);
  assert.equal(response.body.avatarId, "orbit-mint");
  assert.equal(response.body.aiTone, "strict");
});

test("rejects invalid preferences and protects legacy premium opt-in", async () => {
  const startFixture = createFixture();
  const invalid = await request(startFixture.app)
    .patch("/api/user/preferences")
    .set("Authorization", startFixture.authorization)
    .send({ aiTone: "hostile" });
  assert.equal(invalid.status, 400);

  const forbidden = await request(startFixture.app)
    .patch("/api/user/preferences")
    .set("Authorization", startFixture.authorization)
    .send({ focusBetaEnabled: true });
  assert.equal(forbidden.status, 403);

  const foreverFixture = createFixture({
    plan: "forever",
    subscriptionStatus: "active",
  });
  const allowed = await request(foreverFixture.app)
    .patch("/api/user/preferences")
    .set("Authorization", foreverFixture.authorization)
    .send({ focusBetaEnabled: true });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.focusBetaEnabled, true);
});
