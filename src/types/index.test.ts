import { describe, expect, it } from "vitest";
import { schemaProgressOverview, schemaTaskUpdateResponse } from ".";

const task = {
  id: 1,
  title: "Задача",
  date: "2026-08-28",
  priority: "⚡️ P2",
  category: "",
  completed: true,
  completedOn: "2026-08-28",
  xpAwarded: true,
  energyLevel: "med",
  estimatedMinutes: null,
  actualMinutes: null,
  subtasks: [],
};

describe("task completion contract", () => {
  it("accepts additive signed XP outcomes", () => {
    const parsed = schemaTaskUpdateResponse.parse({
      task,
      xpReward: -24,
      xpOutcome: {
        effect: "deducted",
        amount: 24,
        reason: "overdue_blocker",
      },
      userProgress: { xp: 76, level: 2 },
    });

    expect(parsed.xpReward).toBe(-24);
    expect(parsed.xpOutcome?.effect).toBe("deducted");
  });

  it("keeps a legacy response compatible when outcome is absent", () => {
    expect(schemaTaskUpdateResponse.parse({
      task,
      xpReward: 24,
      userProgress: { xp: 124, level: 3 },
    }).xpOutcome).toBeUndefined();
  });
});

describe("rhythm calendar contract", () => {
  it("accepts a bounded 35-day calendar", () => {
    const days = Array.from({ length: 35 }, (_, index) => ({
      date: `2026-08-${String(Math.min(index + 1, 31)).padStart(2, "0")}`,
      inMonth: true,
      state: index === 0 ? "active" : "missed",
    }));
    const parsed = schemaProgressOverview.parse({
      xp: { current: 0, level: 1, nextLevelAt: 50 },
      taskStreak: {
        current: 1,
        longest: 1,
        lastActiveOn: "2026-08-01",
        days: ["2026-08-01"],
        missedDateEligibleForRescue: null,
        calendar: {
          month: "2026-08",
          from: "2026-07-27",
          to: "2026-08-30",
          canGoPrevious: true,
          canGoNext: false,
          days,
        },
      },
      rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
      habits: [],
      achievements: [],
      canUseFocusFeatures: false,
    });

    expect(parsed.taskStreak.calendar?.days).toHaveLength(35);
  });
});
