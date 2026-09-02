import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";

test("linked help exposes the full Russian command menu and section navigation", async () => {
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: { telegramConnection: { findUnique: async () => linkedConnection } },
  });

  await worker.processUpdate(messageUpdate({ text: "/help" }), "10");

  const payload = recorder.calls[0]![1];
  assert.match(payload.text, /\/tasks/);
  assert.match(payload.text, /\/done/);
  assert.match(payload.text, /\/ai/);
  const targets = payload.reply_markup.inline_keyboard
    .flat()
    .map((button) => new URL(button.web_app.url).searchParams.get("target"));
  assert.deepEqual(targets, ["home", "tasks", "notes", "ai", "progress", "analytics", "settings"]);
});

test("an unlinked actor gets no personal data and can open registration", async () => {
  let readPersonalData = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => null },
      task: { findMany: async () => { readPersonalData = true; return []; } },
    },
  });

  await worker.processUpdate(messageUpdate({ text: "/tasks" }), "10");

  assert.equal(readPersonalData, false);
  assert.match(recorder.calls[0]![1].text, /войд.*зарегистрируйся/i);
  assert.ok(recorder.calls[0]![1].reply_markup.inline_keyboard[0]![0]!.web_app);
});

test("voice without STT is not stored and offers a text or Mini App fallback", async () => {
  let mutated = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      telegramTaskDraft: { create: async () => { mutated = true; } },
    },
    answerAi: async () => { mutated = true; },
  });

  await worker.processUpdate(messageUpdate({ voice: { file_id: "private-audio" } }), "10");

  assert.equal(mutated, false);
  assert.match(recorder.calls[0]![1].text, /не распознаю голос бесплатно/i);
  assert.equal(
    new URL(recorder.calls[0]![1].reply_markup.inline_keyboard[0]![0]!.web_app.url)
      .searchParams.get("target"),
    "ai"
  );
});
