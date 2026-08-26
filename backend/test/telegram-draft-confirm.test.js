import assert from "node:assert/strict";
import test from "node:test";
import {
  callbackUpdate,
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
} from "./telegram-test-helpers.js";

const pendingDraft = {
  id: "draft-1",
  connectionId: 5,
  userId: 42,
  title: "Купить хлеб",
  date: "",
  priority: "⚡️ P2",
  energyLevel: "low",
  category: "Личное",
  status: "PENDING",
  expiresAt: new Date("2026-08-26T12:20:00.000Z"),
  taskId: null,
};

test("save callback creates one task in the draft transaction", async () => {
  let created = 0;
  const recorder = createApiRecorder();
  const tx = {
    telegramTaskDraft: {
      findUnique: async () => pendingDraft,
      updateMany: async () => ({ count: 1 }),
      update: async () => ({}),
    },
    task: {},
  };
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      $transaction: async (work) => work(tx),
    },
    createTask: async ({ db, userId, input }) => {
      assert.equal(db, tx);
      assert.equal(userId, 42);
      assert.equal(input.title, "Купить хлеб");
      created += 1;
      return { id: 77, title: input.title };
    },
  });

  await worker.processUpdate(callbackUpdate("tg:save:draft-1"), "11");
  assert.equal(created, 1);
  assert.equal(recorder.calls[0][0], "answerCallbackQuery");
  assert.match(recorder.calls[1][1].text, /Задача сохранена/);
  assert.equal(recorder.calls[2][0], "editMessageReplyMarkup");
});

test("repeated save and foreign draft do not create another task", async () => {
  let created = 0;
  const recorder = createApiRecorder();
  let draft = { ...pendingDraft, status: "CONFIRMED", taskId: 77 };
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      $transaction: async (work) => work({
        telegramTaskDraft: {
          findUnique: async () => draft,
          updateMany: async () => ({ count: 0 }),
          update: async () => ({}),
        },
      }),
    },
    createTask: async () => { created += 1; },
  });
  await worker.processUpdate(callbackUpdate("tg:save:draft-1"), "11");
  draft = { ...pendingDraft, connectionId: 999 };
  await worker.processUpdate(callbackUpdate("tg:save:draft-1"), "12");

  assert.equal(created, 0);
  assert.match(recorder.calls[1][1].text, /уже сохранена/);
  assert.match(recorder.calls[4][1].text, /Не удалось подтвердить/);
});

test("cancel updates only an owned, live pending draft", async () => {
  let receivedWhere;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      telegramTaskDraft: {
        updateMany: async ({ where }) => { receivedWhere = where; return { count: 1 }; },
      },
    },
  });
  await worker.processUpdate(callbackUpdate("tg:cancel:draft-1"), "11");
  assert.equal(receivedWhere.userId, 42);
  assert.equal(receivedWhere.connectionId, 5);
  assert.match(recorder.calls[1][1].text, /Задача не создана/);
});

