import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../types";

const mocks = vi.hoisted(() => ({
  postTask: vi.fn(),
  putTask: vi.fn(),
  deleteTask: vi.fn(),
  createSubTask: vi.fn(),
  updateSubTask: vi.fn(),
  deleteSubTask: vi.fn(),
}));

vi.mock("../api/TaskApi", () => ({
  TaskApi: {
    postTask: mocks.postTask,
    putTask: mocks.putTask,
    deleteTask: mocks.deleteTask,
  },
}));
vi.mock("../api/SubTaskApi", () => ({
  SubTaskApi: {
    createSubTask: mocks.createSubTask,
    updateSubTask: mocks.updateSubTask,
    deleteSubTask: mocks.deleteSubTask,
  },
}));

const { processTaskOfflineOperation } = await import("./taskOfflineSync");

const task: Task = {
  id: 7,
  title: "Задача",
  date: "2026-08-31",
  priority: "⚡️ P2",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: null,
  actualMinutes: null,
  subtasks: [],
};

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

describe("offline task contract reconciliation", () => {
  it("keeps the TaskUpdateResult progress and completion outcome", async () => {
    mocks.putTask.mockResolvedValue({
      task: { ...task, completed: true, completedOn: "2026-08-31" },
      xpReward: 24,
      xpOutcome: { effect: "awarded", amount: 24, reason: "normal" },
      userProgress: { xp: 24, level: 1 },
    });

    const result = await processTaskOfflineOperation(
      {
        id: "update-1",
        ownerKey: "user:42",
        kind: "task.update",
        entityId: 7,
        payload: { completed: true, completedOn: "2026-08-31" },
        createdAt: "2026-08-31T10:00:00.000Z",
      },
      [task]
    );

    expect(mocks.putTask).toHaveBeenCalledWith(7, {
      completed: true,
      completedOn: "2026-08-31",
    });
    expect(result.progress).toEqual({ xp: 24, level: 1 });
    expect(result.completionOutcome?.effect).toBe("awarded");
  });
});
