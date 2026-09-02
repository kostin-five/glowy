import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const backendRoot = new URL(
  import.meta.url.includes("/dist/") ? "../../" : "../",
  import.meta.url
);
const schema = fs.readFileSync(new URL("prisma/schema.prisma", backendRoot), "utf8");
const migration = fs.readFileSync(
  new URL("prisma/migrations/20260826220000_add_telegram_bot/migration.sql", backendRoot),
  "utf8"
);

test("telegram schema stays additive and uses existing user/task relations", () => {
  for (const model of [
    "TelegramConnection",
    "TelegramLinkCode",
    "TelegramTaskDraft",
    "TelegramWebhookUpdate",
  ]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /onDelete: Cascade/);
  assert.match(migration, /do not apply to shared databases/i);
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
});

test("Mini App redesign reuses the existing additive Telegram schema", () => {
  assert.equal((schema.match(/model TelegramConnection \{/g) || []).length, 1);
  assert.doesNotMatch(schema, /model (TelegramUser|MiniAppUser|TelegramSession) \{/);
});
