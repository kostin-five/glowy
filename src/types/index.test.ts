import { describe, expect, it } from "vitest";
import { schemaTaskUpdateResponse } from ".";

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
