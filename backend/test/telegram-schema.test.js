import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schema = fs.readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../prisma/migrations/20260826220000_add_telegram_bot/migration.sql", import.meta.url),
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

