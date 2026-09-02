import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";

test("unlinked data commands reveal no tasks", async () => {
  let tasksRead = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => null },
      task: { findMany: async () => { tasksRead = true; return []; } },
    },
  });

  await worker.processUpdate(messageUpdate({ text: "/today" }), "10");
  assert.equal(tasksRead, false);
  assert.match(recorder.calls[0]![1].text, /подключи Telegram/i);
});

test("today lists only the linked owner's incomplete tasks for Moscow date", async () => {
  let receivedWhere: unknown;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      task: {
        findMany: async ({ where }: { where: unknown }) => {
          receivedWhere = where;
          return [{ id: 1, title: "Сделать отчёт" }];
        },
      },
    },
  });

  await worker.processUpdate(messageUpdate({ text: "/today" }), "10");
  assert.deepEqual(receivedWhere, {
    userId: 42,
    date: "2026-08-26",
    completed: false,
  });
  assert.match(recorder.calls[0]![1].text, /Сделать отчёт/);
});

test("voice never calls task or AI flows", async () => {
  let touched = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      telegramTaskDraft: { create: async () => { touched = true; } },
    },
    generateDraft: async () => { touched = true; },
  });

  await worker.processUpdate(messageUpdate({ voice: { file_id: "voice" } }), "10");
  assert.equal(touched, false);
  assert.match(recorder.calls[0]![1].text, /не распознаю голос бесплатно/i);
});

test("help is Russian and group chats receive no Glowy data", async () => {
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: { telegramConnection: { findUnique: async () => linkedConnection } },
  });
  await worker.processUpdate(messageUpdate({ text: "/help" }), "10");
  await worker.processUpdate(
    messageUpdate({ text: "/today", chat: { id: -22, type: "group" } }),
    "11"
  );

  assert.match(recorder.calls[0]![1].text, /Задача сохраняется только/);
  assert.match(recorder.calls[1]![1].text, /только в личном чате/);
});

test("start, help and app expose the configured Mini App button", async () => {
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: { telegramConnection: { findUnique: async () => linkedConnection } },
  });
  for (const text of ["/start", "/help", "/app"]) {
    await worker.processUpdate(messageUpdate({ text }), "10");
  }
  for (const [, payload] of recorder.calls) {
    const webAppButtons = payload.reply_markup?.inline_keyboard
      ?.flat()
      .filter((button) => button.web_app);
    assert.ok(webAppButtons?.length);
    assert.match(webAppButtons[0]!.web_app.url, /^https:\/\//);
  }
});

test("worker errors never log command text, callback data or provider details", async () => {
  const lines: string[] = [];
  const originalError = console.error;
  console.error = (line) => lines.push(String(line));
  try {
    const recorder = createApiRecorder();
    const worker = createWorkerFixture({
      api: recorder.api,
      db: {
        telegramConnection: {
          findUnique: async () => { throw new Error("provider private detail"); },
        },
      },
      updates: {
        claimNext: async () => ({
          updateId: "private-update",
          attempts: 1,
          payload: messageUpdate({ text: "/ai private command" }),
        }),
        fail: async () => undefined,
      },
    });

    await worker.runOnce();

    const output = lines.join("\n");
    assert.equal(output.includes("private command"), false);
    assert.equal(output.includes("provider private detail"), false);
    assert.equal(output.includes("private-update"), false);
  } finally {
    console.error = originalError;
  }
});
