import { describe, expect, it } from "vitest";
import type { Task } from "../types";
import {
  getTaskEnergyAccentStyles,
  getTaskPlannedDuration,
  getTaskPriorityLabel,
  getTaskSubtaskProgress,
} from "./taskCardPresentation";

const task = (patch: Partial<Task> = {}): Task => ({
  id: 1,
  title: "Задача",
  date: "2026-08-28",
  priority: "⚡️ P2",
  category: "",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: 90,
  actualMinutes: null,
  subtasks: [],
  ...patch,
});

describe("task card presentation", () => {
  it("normalizes labels, accents and duration", () => {
    expect(getTaskPriorityLabel("🔥 P1")).toBe("Высокий");
    expect(getTaskEnergyAccentStyles("low")).toBe("bg-green-500");
    expect(getTaskPlannedDuration(task())).toBe("1 ч 30 мин");
  });

  it("returns subtask progress only when subtasks exist", () => {
    expect(getTaskSubtaskProgress(task())).toBeNull();
    expect(getTaskSubtaskProgress(task({
      subtasks: [
        { id: 1, taskId: 1, title: "Первый", completed: true, position: 0 },
        { id: 2, taskId: 1, title: "Второй", completed: false, position: 1 },
      ],
    }))).toEqual({ completed: 1, total: 2 });
  });
});

