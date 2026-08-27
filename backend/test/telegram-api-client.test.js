import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramApiClient } from "../services/telegram/telegram-api.client.js";
import { TELEGRAM_BOT_COMMANDS } from "../services/telegram/telegram-command-catalog.js";

test("sends menu and command configuration through the Bot API adapter", async () => {
  const calls = [];
  const api = createTelegramApiClient({
    token: "test-token",
    fetchImpl: async (url, options) => {
      calls.push([url, JSON.parse(options.body)]);
      return { ok: true, status: 200, json: async () => ({ ok: true, result: true }) };
    },
  });
  await api.setChatMenuButton({ menu_button: { type: "web_app" } });
  await api.setMyCommands({ commands: [{ command: "start", description: "Открыть Glowy" }] });
  assert.match(calls[0][0], /setChatMenuButton$/);
  assert.match(calls[1][0], /setMyCommands$/);
});

test("the final command catalogue exposes every quick-controller action", () => {
  assert.deepEqual(
    TELEGRAM_BOT_COMMANDS.map(({ command }) => command),
    [
      "app", "home", "today", "tasks", "add", "done", "energy",
      "progress", "ai", "notes", "analytics", "settings", "unlink", "help",
    ]
  );
  assert.ok(TELEGRAM_BOT_COMMANDS.every(({ description }) => /[А-Яа-яЁё]/.test(description)));
});
