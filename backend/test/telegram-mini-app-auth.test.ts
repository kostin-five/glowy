import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  createTelegramMiniAppAuthService,
  TelegramMiniAppAuthError,
} from "../services/telegram/telegram-mini-app-auth.service.js";

const token = "123456:test-token";
const now = new Date("2026-08-27T10:00:00.000Z");

const sign = (values: Record<string, string>) => {
  const params = new URLSearchParams(values);
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  params.set(
    "hash",
    crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex")
  );
  return params.toString();
};

test("validates fresh Telegram Mini App init data", () => {
  const service = createTelegramMiniAppAuthService({ botToken: token, now: () => now });
  const initData = sign({
    auth_date: String(Math.floor(now.getTime() / 1000) - 60),
    query_id: "query-1",
    user: JSON.stringify({ id: 1001, first_name: "Не хранить" }),
  });
  assert.deepEqual(service.validate(initData), {
    telegramUserId: "1001",
    authDate: Math.floor(now.getTime() / 1000) - 60,
    queryId: "query-1",
  });
});

test("rejects tampering and data older than five minutes even if configuration is larger", () => {
  const service = createTelegramMiniAppAuthService({
    botToken: token,
    maxAgeSeconds: 999,
    now: () => now,
  });
  const stale = sign({
    auth_date: String(Math.floor(now.getTime() / 1000) - 301),
    user: JSON.stringify({ id: 1001 }),
  });
  assert.throws(() => service.validate(stale), TelegramMiniAppAuthError);
  assert.throws(() => service.validate(`${stale}&query_id=changed`), TelegramMiniAppAuthError);
});

test("rejects duplicate fields and missing server configuration", () => {
  const service = createTelegramMiniAppAuthService({ botToken: token, now: () => now });
  const fresh = sign({
    auth_date: String(Math.floor(now.getTime() / 1000)),
    user: JSON.stringify({ id: 1001 }),
  });
  assert.throws(() => service.validate(`${fresh}&user={}`), TelegramMiniAppAuthError);
  assert.throws(
    () => createTelegramMiniAppAuthService({ botToken: "" }).validate(fresh),
    (error: unknown) =>
      error instanceof TelegramMiniAppAuthError &&
      error.code === "TELEGRAM_NOT_CONFIGURED" &&
      error.status === 503
  );
});
