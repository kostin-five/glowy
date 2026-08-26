import { describe, expect, it } from "vitest";
import type { OfflineTaskOperation } from "./taskOfflineTypes";
import { compactTaskOperations } from "./taskOfflineQueue";

const base = {
  ownerKey: "user:1",
  createdAt: "2026-08-22T10:00:00.000Z",
};

describe("compactTaskOperations", () => {
  it("merges repeated updates and keeps the latest fields", () => {
    const operations: OfflineTaskOperation[] = [
      {
        ...base,
        id: "first",
        kind: "task.update",
        entityId: 7,
        payload: { title: "Черновик", completed: false },
      },
      {
        ...base,
        id: "second",
        kind: "task.update",
        entityId: 7,
        payload: { title: "Итог", energyLevel: "high" },
      },
    ];

    expect(compactTaskOperations(operations)).toEqual([
      expect.objectContaining({
        id: "second",
        kind: "task.update",
        entityId: 7,
        payload: { title: "Итог", completed: false, energyLevel: "high" },
      }),
    ]);
  });

  it("removes an unsynced task and all of its dependent operations", () => {
    const operations: OfflineTaskOperation[] = [
      {
        ...base,
        id: "create-task",
        kind: "task.create",
        entityId: -10,
        payload: {
          title: "Временная задача",
          date: "",
          priority: "⚡️ P2",
          energyLevel: "med",
          category: "Другое",
          completed: false,
          subtasks: [],
        },
      },
      {
        ...base,
        id: "update-task",
        kind: "task.update",
        entityId: -10,
        payload: { title: "Новое название" },
      },
      {
        ...base,
        id: "create-subtask",
        kind: "subtask.create",
        entityId: -11,
        taskId: -10,
        payload: { title: "Шаг", completed: false, position: 0 },
      },
      {
        ...base,
        id: "delete-task",
        kind: "task.delete",
        entityId: -10,
        payload: {},
      },
    ];

    expect(compactTaskOperations(operations)).toEqual([]);
  });

  it("removes an unsynced subtask instead of sending create and delete", () => {
    const operations: OfflineTaskOperation[] = [
      {
        ...base,
        id: "create-subtask",
        kind: "subtask.create",
        entityId: -21,
        taskId: 7,
        payload: { title: "Временный шаг", completed: false, position: 0 },
      },
      {
        ...base,
        id: "update-subtask",
        kind: "subtask.update",
        entityId: -21,
        taskId: 7,
        payload: { title: "Новое название" },
      },
      {
        ...base,
        id: "delete-subtask",
        kind: "subtask.delete",
        entityId: -21,
        taskId: 7,
        payload: {},
      },
    ];

    expect(compactTaskOperations(operations)).toEqual([]);
  });

  it("preserves the order of independent operations", () => {
    const operations: OfflineTaskOperation[] = [
      {
        ...base,
        id: "task-one",
        kind: "task.delete",
        entityId: 1,
        payload: {},
      },
      {
        ...base,
        id: "task-two",
        kind: "task.update",
        entityId: 2,
        payload: { completed: true },
      },
    ];

    expect(compactTaskOperations(operations).map(({ id }) => id)).toEqual([
      "task-one",
      "task-two",
    ]);
  });
});
