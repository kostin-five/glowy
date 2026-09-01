import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorSchema,
  authLoginRequestSchema,
  authLogoutResponseSchema,
  authRegisterRequestSchema,
  safeUserSchema,
} from "../dist/index.js";

const requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";

test("parses register, login and safe user auth contracts", () => {
  assert.equal(
    authRegisterRequestSchema.parse({
      name: " Тест ",
      email: "TEST@example.com",
      password: "password1",
    }).email,
    "test@example.com"
  );
  assert.equal(
    authLoginRequestSchema.parse({ email: "test@example.com", password: "password1" }).email,
    "test@example.com"
  );
  assert.equal(
    safeUserSchema.parse({
      id: 42,
      name: "Тест",
      email: "test@example.com",
      xp: 0,
      level: 1,
      avatarId: null,
      aiTone: "calm",
    }).id,
    42
  );
});

test("parses logout and additive auth errors", () => {
  assert.equal(
    authLogoutResponseSchema.parse({ message: "Выход выполнен" }).message,
    "Выход выполнен"
  );
  assert.equal(
    authErrorSchema.parse({
      error: "Неверный email или пароль",
      code: "AUTH_INVALID_CREDENTIALS",
      requestId,
    }).requestId,
    requestId
  );
});

test("rejects unsafe auth input and leaked user fields", () => {
  assert.equal(
    authRegisterRequestSchema.safeParse({
      name: "Тест",
      email: "invalid",
      password: "short",
    }).success,
    false
  );
  assert.equal(
    safeUserSchema.safeParse({
      id: 42,
      name: "Тест",
      email: "test@example.com",
      xp: 0,
      level: 1,
      avatarId: null,
      aiTone: "calm",
      password: "must-not-pass",
    }).success,
    false
  );
});
