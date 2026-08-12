import assert from "node:assert/strict";
import test from "node:test";
import { createTaskForUser } from "../services/tasks/task-create.service.js";

test("shared task creation preserves owner and ordered subtasks", async () => {
  let createArgs;
  const db = { task: { create: async (args) => { createArgs = args; return { id: 7, ...args.data }; } } };
  const result = await createTaskForUser(db, 12, { title: "Сделать уроки", date: "2026-08-13", priority: "⚡️ P2", energyLevel: "med", category: "Учеба", subtasks: [{ title: " Математика ", position: 9 }, { title: "" }] });
  assert.equal(result.userId, 12);
  assert.deepEqual(createArgs.data.subtasks.create, [{ title: "Математика", completed: false, position: 9 }]);
  assert.equal(createArgs.data.completed, false);
});
