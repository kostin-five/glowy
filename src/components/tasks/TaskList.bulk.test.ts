import { describe, expect, it, vi } from "vitest";
import type { Task } from "../../types";
import { getTomorrowDate, moveSelectedTasks } from "./bulkTaskActions";

const task = (id: number): Task => ({
  id,
  title: `Задача ${id}`,
  date: "2026-08-28",
  priority: "⚡️ P2",
  category: "",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: null,
  actualMinutes: null,
  subtasks: [],
});

describe("bulk task moves", () => {
  it("uses the next local calendar day", () => {
    expect(getTomorrowDate(new Date(2026, 7, 31, 23, 30))).toBe("2026-09-01");
  });

  it("reports partial success and skips completed tasks", async () => {
    const tasks = [task(1), task(2), { ...task(3), completed: true }];
    const updateTask = vi.fn(async (id: number, patch: Partial<Task>) =>
      id === 2 ? undefined : { ...task(id), ...patch }
    );
    const result = await moveSelectedTasks({
      tasks,
      selectedIds: new Set([1, 2, 3]),
      targetDate: "2026-09-10",
      updateTask,
    });
    expect(result).toEqual({ succeededIds: [1], failedIds: [2] });
    expect(updateTask).toHaveBeenCalledTimes(2);
  });
});

