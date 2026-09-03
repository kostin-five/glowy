import { describe, expect, it } from "vitest";
import type { Task } from "../types";
import { buildDayPlan } from "./dayPlan";

const createTask = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Задача ${id}`,
  date: "",
  priority: "⚡️ P2",
  category: "",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: null,
  actualMinutes: null,
  subtasks: [],
  ...overrides,
});

describe("buildDayPlan", () => {
  it.each([
    [20, 1],
    [50, 2],
    [90, 3],
  ])("limits energy %s to %s planned tasks", (energy, expected) => {
    const tasks = [1, 2, 3, 4].map((id) => createTask(id));

    expect(buildDayPlan(tasks, energy, "2026-09-04")).toHaveLength(expected);
  });

  it("ranks overdue and today tasks ahead of undated and future tasks", () => {
    const result = buildDayPlan([
      createTask(4, { title: "Будущая", date: "2026-09-05" }),
      createTask(3, { title: "Без даты" }),
      createTask(2, { title: "Сегодня", date: "2026-09-04" }),
      createTask(1, { title: "Просроченная", date: "2026-09-03" }),
    ], 100, "2026-09-04");

    expect(result.map(({ task }) => task.id)).toEqual([1, 2, 3]);
    expect(result[0].reason).toContain("Срок уже прошёл");
    expect(result[1].isToday).toBe(true);
  });

  it("uses energy, duration and priority without including completed tasks", () => {
    const result = buildDayPlan([
      createTask(1, { energyLevel: "high", priority: "🔥 P1", estimatedMinutes: 90 }),
      createTask(2, { energyLevel: "low", priority: "💤 P3", estimatedMinutes: 15 }),
      createTask(3, { energyLevel: "low", completed: true, estimatedMinutes: 5 }),
    ], 20, "2026-09-04");

    expect(result).toHaveLength(1);
    expect(result[0].task.id).toBe(2);
    expect(result[0].reason).toContain("Короткая задача");
  });

  it("keeps a stable id fallback for identical tasks", () => {
    const result = buildDayPlan([
      createTask(2, { title: "Одинаково" }),
      createTask(1, { title: "Одинаково" }),
    ], 50, "2026-09-04");

    expect(result.map(({ task }) => task.id)).toEqual([1, 2]);
  });
});
