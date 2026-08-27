import assert from "node:assert/strict";
import test from "node:test";
import { completeTaskForUser } from "../services/tasks/task-completion.service.js";

test("completion awards XP once and repeated completion is idempotent", async () => {
  const task = {
    id: 7,
    userId: 42,
    completed: false,
    completedOn: null,
    xpAwarded: false,
    energyLevel: "med",
    priority: "⚡️ P2",
  };
  const user = { id: 42, xp: 90, level: 1 };
  const tx = {
    task: {
      findUnique: async () => ({ ...task }),
      updateMany: async ({ where, data }) => {
        if (task.completed || where.userId !== task.userId) return { count: 0 };
        Object.assign(task, data);
        return { count: 1 };
      },
    },
    user: {
      findUnique: async () => ({ xp: user.xp }),
      update: async ({ data }) => { Object.assign(user, data); return user; },
    },
  };
  const db = { $transaction: async (run) => run(tx) };

  const first = await completeTaskForUser({ db, userId: 42, taskId: 7, completedOn: "2026-08-27" });
  const xpAfterFirst = user.xp;
  const second = await completeTaskForUser({ db, userId: 42, taskId: 7, completedOn: "2026-08-27" });

  assert.equal(first.state, "COMPLETED");
  assert.equal(first.xpReward, 24);
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
