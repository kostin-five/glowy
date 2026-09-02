import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";

test("tasks reads only twelve incomplete tasks owned by the linked user", async () => {
  let taskRequest: { where: unknown; take: number } | undefined;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      task: {
        findMany: async (args: { where: unknown; take: number }) => {
          taskRequest = args;
          return Array.from({ length: 12 }, (_, index) => ({
            id: index + 1,
            title: `Задача ${index + 1}`,
            date: index === 0 ? "2026-08-27" : "",
          }));
        },
      },
    },
  });

  await worker.processUpdate(messageUpdate({ text: "/tasks" }), "10");

  assert.ok(taskRequest);
  assert.deepEqual(taskRequest.where, { userId: 42, completed: false });
  assert.equal(taskRequest.take, 12);
  assert.match(recorder.calls[0]![1].text, /Задача 12/);
  assert.equal(recorder.calls[0]![1].text.includes("Задача 13"), false);
});

test("progress returns only the linked user's existing summary", async () => {
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      user: {
        findUnique: async ({ where }: { where: unknown }) => {
          assert.deepEqual(where, { id: 42 });
          return { xp: 270, level: 4 };
        },
      },
      task: {
        count: async ({ where }: { where: unknown }) => {
          assert.deepEqual(where, { userId: 42, completed: true });
          return 8;
        },
      },
    },
  });

  await worker.processUpdate(messageUpdate({ text: "/progress" }), "10");

  assert.match(recorder.calls[0]![1].text, /Уровень: 4/);
  assert.match(recorder.calls[0]![1].text, /XP: 270/);
  assert.match(recorder.calls[0]![1].text, /Выполнено задач: 8/);
});
