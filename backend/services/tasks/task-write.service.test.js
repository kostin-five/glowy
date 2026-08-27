import assert from "node:assert/strict";
import test from "node:test";
import { createTaskForUser, normalizeTaskWriteInput } from "./task-write.service.js";

test("normalizes the existing Glowy task contract", () => {
  const result = normalizeTaskWriteInput({
    title: "  Позвонить врачу  ",
    date: "2026-08-27",
    priority: "🔥 P1",
    energyLevel: "high",
    category: " Здоровье ",
    subtasks: [{ title: " Записать номер " }, { title: " " }],
  });

  assert.equal(result.data.title, "Позвонить врачу");
  assert.equal(result.data.category, "Здоровье");
  assert.deepEqual(result.data.subtasks, [
    { title: "Записать номер", completed: false, position: 0 },
  ]);
});

test("rejects invalid task data before database access", async () => {
  let touched = false;
  await assert.rejects(
    createTaskForUser({
      db: { task: { create: async () => { touched = true; } } },
      userId: 42,
      input: { title: "", date: "27.08.2026" },
    }),
    (error) => error.code === "INVALID_TASK_INPUT" && error.status === 400
  );
  assert.equal(touched, false);
});

test("creates a task for the explicit owner", async () => {
  let received;
  const task = await createTaskForUser({
    db: { task: { create: async (args) => { received = args; return { id: 7 }; } } },
    userId: 42,
    input: { title: "Купить хлеб", date: "", category: "Личное" },
    include: { subtasks: true },
  });

  assert.equal(task.id, 7);
  assert.equal(received.data.userId, 42);
  assert.deepEqual(received.include, { subtasks: true });
});
