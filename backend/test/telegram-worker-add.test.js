import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";

test("add creates only a pending AI draft under the shared limit", async () => {
  const events = [];
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      telegramTaskDraft: {
        findUnique: async () => null,
        create: async ({ data }) => {
          events.push(["draft", data]);
          return { id: "draft-1", status: "PENDING", ...data };
        },
      },
      task: { create: async () => { throw new Error("must not create"); } },
    },
    previewAiLimit: async (userId) => { events.push(["preview", userId]); return { allowed: true }; },
    generateDraft: async (text, context) => {
      events.push(["generate", text, context.userId]);
      return { title: "Купить хлеб", date: "", priority: "⚡️ P2", energyLevel: "low", category: "Личное" };
    },
    consumeAiRequest: async (userId) => { events.push(["consume", userId]); return { allowed: true }; },
  });

  await worker.processUpdate(messageUpdate({ text: "/add купить хлеб" }), "10");
  assert.deepEqual(events.slice(0, 3), [
    ["preview", 42],
    ["generate", "купить хлеб", 42],
    ["consume", 42],
  ]);
  assert.equal(events[3][0], "draft");
  assert.equal(events[3][1].sourceUpdateId, "10");
  assert.match(recorder.calls.at(-1)[1].text, /Черновик задачи/);
});

test("add respects an exhausted AI limit without provider use", async () => {
  let generated = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      telegramTaskDraft: { findUnique: async () => null },
    },
    previewAiLimit: async () => ({ allowed: false }),
    generateDraft: async () => { generated = true; },
  });
  await worker.processUpdate(messageUpdate({ text: "/add купить хлеб" }), "10");
  assert.equal(generated, false);
  assert.match(recorder.calls[0][1].text, /Лимит AI-запросов исчерпан/);
});

test("bare add waits for the next text for a bounded time", async () => {
  let updateData;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: {
        findUnique: async () => linkedConnection,
        update: async ({ data }) => { updateData = data; return {}; },
      },
    },
  });
  await worker.processUpdate(messageUpdate({ text: "/add" }), "10");
  assert.equal(updateData.pendingCommand, "ADD");
  assert.equal(updateData.pendingCommandExpiresAt.toISOString(), "2026-08-26T12:10:00.000Z");
});

