import assert from "node:assert/strict";
import test from "node:test";
import {
  callbackUpdate,
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";
import { buildCompletionXpOutcome } from "../services/tasks/task-completion.service.js";

test("done lists owned incomplete tasks and asks for a second confirmation", async () => {
  const recorder = createApiRecorder();
  const db = {
    telegramConnection: { findUnique: async () => linkedConnection },
    task: {
      findMany: async ({ where, take }: { where: unknown; take: number }) => {
        assert.deepEqual(where, { userId: 42, completed: false });
        assert.equal(take, 8);
        return [{ id: 7, title: "Закончить отчёт" }];
      },
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, { id: 7, userId: 42, completed: false });
        return { id: 7, title: "Закончить отчёт" };
      },
    },
  };
  const worker = createWorkerFixture({ api: recorder.api, db });

  await worker.processUpdate(messageUpdate({ text: "/done" }), "10");
  await worker.processUpdate(callbackUpdate("tg:done-pick:7"), "11");

  assert.equal(recorder.calls[0]![1].reply_markup.inline_keyboard[0]![0]!.callback_data, "tg:done-pick:7");
  assert.match(recorder.calls.at(-1)![1].text, /Отметить задачу выполненной/);
  assert.equal(recorder.calls.at(-1)![1].reply_markup.inline_keyboard[0]![0]!.callback_data, "tg:done-confirm:7");
});

test("done confirm delegates to the shared owned completion service once", async () => {
  let completionArgs: { userId: number; taskId: number; completedOn: string } | undefined;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: { telegramConnection: { findUnique: async () => linkedConnection } },
    completeTask: async (args) => {
      completionArgs = args;
      return {
        state: "COMPLETED",
        xpReward: 20,
        xpOutcome: { effect: "awarded", amount: 20, reason: "normal" },
      };
    },
  });

  await worker.processUpdate(callbackUpdate("tg:done-confirm:7"), "11");

  assert.ok(completionArgs);
  assert.equal(completionArgs.userId, 42);
  assert.equal(completionArgs.taskId, 7);
  assert.equal(completionArgs.completedOn, "2026-08-26");
  assert.match(recorder.calls.at(-1)![1].text, /Начислено \+20 XP/);
});

test("done reports withheld and deducted XP without exposing another task", async () => {
  const displayCases: Array<[string, number, RegExp]> = [
    ["withheld", 0, /XP не начислены/],
    ["deducted", 20, /Списано 20 XP/],
  ];
  for (const [effect, amount, expected] of displayCases) {
    const recorder = createApiRecorder();
    const worker = createWorkerFixture({
      api: recorder.api,
      db: { telegramConnection: { findUnique: async () => linkedConnection } },
      completeTask: async () => ({
        state: "COMPLETED",
        xpReward: effect === "deducted" ? -amount : 0,
        xpOutcome: { effect, amount, reason: "overdue_blocker" },
      }),
    });

    await worker.processUpdate(callbackUpdate("tg:done-confirm:7"), "11");
    assert.match(recorder.calls.at(-1)![1].text, expected);
    assert.doesNotMatch(recorder.calls.at(-1)![1].text, /название|отч[её]т/i);
  }
});

test("shared behavior matrix produces the same signed outcome consumed by Telegram", async () => {
  type Tone = Parameters<typeof buildCompletionXpOutcome>[0]["aiTone"];
  const cases: Array<[Tone, string, number, RegExp]> = [
    ["calm", "awarded", 24, /Начислено \+24 XP/],
    ["moderate", "withheld", 0, /XP не начислены/],
    ["strict", "deducted", -24, /Списано 24 XP/],
  ];

  for (const [aiTone, effect, xpDelta, expectedMessage] of cases) {
    const outcome = buildCompletionXpOutcome({
      aiTone,
      reward: 24,
      currentXp: 90,
      hasOverdueBlocker: true,
      targetIsOverdue: false,
    });
    assert.equal(outcome.effect, effect);
    assert.equal(outcome.xpDelta, xpDelta);

    const recorder = createApiRecorder();
    const worker = createWorkerFixture({
      api: recorder.api,
      db: { telegramConnection: { findUnique: async () => linkedConnection } },
      completeTask: async () => ({
        state: "COMPLETED",
        xpReward: outcome.xpDelta,
        xpOutcome: outcome,
      }),
    });

    await worker.processUpdate(callbackUpdate("tg:done-confirm:7"), "11");
    assert.match(recorder.calls.at(-1)![1].text, expectedMessage);
  }
});

test("done cancel and foreign task do not complete anything", async () => {
  let completionCalls = 0;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      task: { findFirst: async () => null },
    },
    completeTask: async () => { completionCalls += 1; },
  });

  await worker.processUpdate(callbackUpdate("tg:done-pick:99"), "11");
  await worker.processUpdate(callbackUpdate("tg:done-cancel:7"), "12");

  assert.equal(completionCalls, 0);
  assert.match(recorder.calls.at(-1)![1].text, /не изменена/);
});

test("repeated done callback reports once-only completion without XP", async () => {
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: { telegramConnection: { findUnique: async () => linkedConnection } },
    completeTask: async () => ({ state: "ALREADY_COMPLETED" }),
  });

  await worker.processUpdate(callbackUpdate("tg:done-confirm:7"), "11");

  assert.match(recorder.calls.at(-1)![1].text, /Повторно XP не начислены/);
});
