import assert from "node:assert/strict";
import test from "node:test";
import {
  subTaskSchema,
  taskDraftSchema,
  taskSchema,
  taskUpdateResponseSchema,
} from "../dist/index.js";

const task = {
  id: 7,
  title: "Подготовить отчёт",
  date: "2026-08-31",
  priority: "🔥 P1",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "high",
  estimatedMinutes: 60,
  actualMinutes: null,
  subtasks: [
    { id: 8, taskId: 7, title: "Собрать данные", completed: false, position: 0 },
  ],
};

test("parses task, draft, subtask and update envelopes", () => {
  assert.equal(taskSchema.parse(task).date, "2026-08-31");
  assert.equal(subTaskSchema.parse(task.subtasks[0]).taskId, 7);
  assert.equal(
    taskDraftSchema.parse({
      title: "Новая задача",
      date: "",
      priority: "⚡️ P2",
      category: "Быт",
      energyLevel: "med",
      subtasks: [],
    }).completed,
    false
  );
  assert.equal(
    taskUpdateResponseSchema.parse({
      task,
      xpReward: 10,
      xpOutcome: { effect: "awarded", amount: 10, reason: "normal" },
      userProgress: { xp: 10, level: 1 },
    }).xpReward,
    10
  );
});

test("rejects invalid dates, ownership IDs and update envelopes", () => {
  assert.equal(taskSchema.safeParse({ ...task, date: "31.08.2026" }).success, false);
  assert.equal(subTaskSchema.safeParse({ ...task.subtasks[0], taskId: -1 }).success, false);
  assert.equal(
    taskUpdateResponseSchema.safeParse({ task, xpReward: "10", userProgress: null }).success,
    false
  );
});
