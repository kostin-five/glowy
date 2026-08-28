import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompletionXpOutcome,
  completeTaskForUser,
} from "../services/tasks/task-completion.service.js";

test("behavior XP policy awards, withholds, deducts and clamps", () => {
  const base = { reward: 24, currentXp: 90, hasOverdueBlocker: true, targetIsOverdue: false };

  assert.deepEqual(buildCompletionXpOutcome({ ...base, aiTone: "calm" }), {
    effect: "awarded", amount: 24, reason: "normal", xpDelta: 24,
  });
  assert.deepEqual(buildCompletionXpOutcome({ ...base, aiTone: "moderate" }), {
    effect: "withheld", amount: 0, reason: "overdue_blocker", xpDelta: 0,
  });
  assert.deepEqual(buildCompletionXpOutcome({ ...base, aiTone: "strict" }), {
    effect: "deducted", amount: 24, reason: "overdue_blocker", xpDelta: -24,
  });
  assert.equal(buildCompletionXpOutcome({ ...base, aiTone: "strict", currentXp: 5 }).xpDelta, -5);
  assert.equal(buildCompletionXpOutcome({ ...base, aiTone: "strict", targetIsOverdue: true }).xpDelta, 24);
});

test("completion awards XP once and repeated completion is idempotent", async () => {
  const task = {
    id: 7,
    userId: 42,
    completed: false,
    completedOn: null,
    date: "2026-08-27",
    xpAwarded: false,
    energyLevel: "med",
    priority: "⚡️ P2",
  };
  const user = { id: 42, xp: 90, level: 1 };
  const tx = {
    task: {
      findUnique: async () => ({ ...task }),
      findFirst: async () => null,
      updateMany: async ({ where, data }) => {
        if (task.completed || where.userId !== task.userId) return { count: 0 };
        Object.assign(task, data);
        return { count: 1 };
      },
    },
    user: {
      findUnique: async () => ({ xp: user.xp, aiTone: "calm" }),
      update: async ({ data }) => { Object.assign(user, data); return user; },
    },
  };
  const db = { $transaction: async (run) => run(tx) };

  const first = await completeTaskForUser({ db, userId: 42, taskId: 7, completedOn: "2026-08-27" });
  const xpAfterFirst = user.xp;
  const second = await completeTaskForUser({ db, userId: 42, taskId: 7, completedOn: "2026-08-27" });

  assert.equal(first.state, "COMPLETED");
  assert.equal(first.xpReward, 24);
  assert.equal(first.xpOutcome.effect, "awarded");
  assert.deepEqual(first.userProgress, { xp: 114, level: 3 });
  assert.equal(second.state, "ALREADY_COMPLETED");
  assert.equal(user.xp, xpAfterFirst);
});

test("completion rejects a task owned by another user", async () => {
  const db = {
    $transaction: async (run) => run({
      task: { findUnique: async () => ({ id: 8, userId: 9, completed: false }) },
    }),
  };
  const result = await completeTaskForUser({ db, userId: 42, taskId: 8, completedOn: "2026-08-27" });
  assert.deepEqual(result, { state: "INVALID" });
});
