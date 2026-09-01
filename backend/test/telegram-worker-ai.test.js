import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";

test("bare ai waits for the next message and clears the bounded pending flow", async () => {
  const updates = [];
  let connection = linkedConnection;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: {
        findUnique: async () => connection,
        update: async (args) => { updates.push(args); return {}; },
      },
    },
    answerAi: async (text) => `Ответ: ${text}`,
  });

  await worker.processUpdate(messageUpdate({ text: "/ai" }), "10");
  assert.equal(updates[0].data.pendingCommand, "AI");
  assert.ok(updates[0].data.pendingCommandExpiresAt);
  assert.equal(
    new URL(recorder.calls[0][1].reply_markup.inline_keyboard[1][0].web_app.url)
      .searchParams.get("target"),
    "ai"
  );

  connection = {
    ...linkedConnection,
    pendingCommand: "AI",
    pendingCommandExpiresAt: new Date("2026-08-26T12:05:00.000Z"),
  };
  await worker.processUpdate(messageUpdate({ text: "Как начать спокойно?" }), "11");
  assert.deepEqual(updates[1].data, { pendingCommand: null, pendingCommandExpiresAt: null });
  assert.match(recorder.calls.at(-1)[1].text, /Ответ: Как начать спокойно/);
});

test("ai respects the shared limit and does not call the provider", async () => {
  let providerCalled = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: { telegramConnection: { findUnique: async () => linkedConnection } },
    reserveAiRequest: async () => ({ allowed: false }),
    answerAi: async () => { providerCalled = true; },
  });

  await worker.processUpdate(messageUpdate({ text: "/ai вопрос" }), "10");

  assert.equal(providerCalled, false);
  assert.match(recorder.calls[0][1].text, /Лимит AI-запросов исчерпан/);
});

test("provider failure is controlled and ai answers are not persisted by the bot", async () => {
  const recorder = createApiRecorder();
  const db = { telegramConnection: { findUnique: async () => linkedConnection } };
  let released;
  const worker = createWorkerFixture({
    api: recorder.api,
    db,
    releaseAiRequest: async (reservation) => { released = reservation; },
    answerAi: async () => { throw Object.assign(new Error("provider text"), { code: "BAD_REPLY" }); },
  });

  await worker.processUpdate(messageUpdate({ text: "/ai Помоги" }), "10");

  assert.match(recorder.calls[0][1].text, /пока не ответил/);
  assert.equal(Object.keys(db).includes("chat"), false);
  assert.deepEqual(released, {
    userId: 42,
    cost: 1,
    resetAt: "2026-08-27T12:00:00.000Z",
  });
});
