import { describe, expect, it } from "vitest";
import type { Task } from "../types";
import {
  getCompletionOutcomeNotice,
  getOptimisticCompletionOutcome,
} from "./useTaskStore";

const task = (patch: Partial<Task>): Task => ({
  id: 1,
  title: "Задача",
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
  ...patch,
});

describe("behavior-aware optimistic completion", () => {
  const target = task({ id: 1 });
  const blocker = task({ id: 2, date: "2026-08-20" });

  it("keeps calm reward and applies moderate/strict consequences provisionally", () => {
    const base = {
      currentXP: 10,
      task: target,
      tasks: [target, blocker],
      completedOn: "2026-08-28",
    };

    expect(getOptimisticCompletionOutcome({ ...base, aiTone: "calm" }).delta).toBe(24);
    expect(getOptimisticCompletionOutcome({ ...base, aiTone: "moderate" }).delta).toBe(0);
    expect(getOptimisticCompletionOutcome({ ...base, aiTone: "strict" }).delta).toBe(-10);
  });

  it("does not penalize completion of the overdue target itself", () => {
    expect(getOptimisticCompletionOutcome({
      currentXP: 10,
      task: blocker,
      tasks: [target, blocker],
      completedOn: "2026-08-28",
      aiTone: "strict",
    }).delta).toBe(24);
  });

  it("maps server outcomes to safe explanations", () => {
    expect(getCompletionOutcomeNotice({
      effect: "deducted",
      amount: 10,
      reason: "overdue_blocker",
    })).toMatch(/Списано 10 XP/);
  });
});
