import { describe, expect, it } from "vitest";
import type { Task } from "../types";
import {
  countTaskAdvancedFilters,
  EMPTY_TASK_ADVANCED_FILTERS,
  filterTasksAdvanced,
} from "./taskAdvancedFilters";

const tasks: Task[] = [
  { id: 1, title: "Просроченная", date: "2026-09-03", priority: "🔥 P1", category: "Работа", completed: false, completedOn: null, xpAwarded: false, energyLevel: "high", estimatedMinutes: 60, actualMinutes: null, subtasks: [] },
  { id: 2, title: "Сегодня", date: "2026-09-04", priority: "⚡️ P2", category: "Работа", completed: false, completedOn: null, xpAwarded: false, energyLevel: "med", estimatedMinutes: 30, actualMinutes: null, subtasks: [] },
  { id: 3, title: "Будущая", date: "2026-09-05", priority: "💤 P3", category: "Личное", completed: false, completedOn: null, xpAwarded: false, energyLevel: "low", estimatedMinutes: null, actualMinutes: null, subtasks: [] },
  { id: 4, title: "Без даты", date: "", priority: "⚡️ P2", category: "Личное", completed: true, completedOn: "2026-09-04", xpAwarded: true, energyLevel: "med", estimatedMinutes: null, actualMinutes: null, subtasks: [] },
];

describe("task advanced filters", () => {
  it("keeps original order and combines filters", () => {
    expect(filterTasksAdvanced(tasks, { date: "today", energy: "med", priority: "⚡️ P2", category: "Работа" }, "2026-09-04").map((task) => task.id)).toEqual([2]);
  });

  it.each([
    ["overdue", [1]], ["today", [2]], ["future", [3]], ["undated", [4]],
  ] as const)("filters the %s date group", (date, expected) => {
    expect(filterTasksAdvanced(tasks, { ...EMPTY_TASK_ADVANCED_FILTERS, date }, "2026-09-04").map((task) => task.id)).toEqual(expected);
  });

  it("counts only active conditions", () => {
    expect(countTaskAdvancedFilters(EMPTY_TASK_ADVANCED_FILTERS)).toBe(0);
    expect(countTaskAdvancedFilters({ date: "future", energy: "low", priority: "all", category: "Личное" })).toBe(3);
  });
});
