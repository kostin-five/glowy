import { describe, expect, it } from "vitest";
import { formatPlannedDuration, isStrictOverdueTask } from "./behaviorMode";

describe("behavior-mode task presentation", () => {
  it("formats planned duration without an empty marker", () => {
    expect(formatPlannedDuration(null)).toBeNull();
    expect(formatPlannedDuration(25)).toBe("25 мин");
    expect(formatPlannedDuration(60)).toBe("1 ч");
    expect(formatPlannedDuration(95)).toBe("1 ч 35 мин");
  });

  it("highlights only active overdue tasks in strict mode", () => {
    const active = { completed: false, date: "2026-08-27" };
    expect(isStrictOverdueTask(active, "strict", "2026-08-28")).toBe(true);
    expect(isStrictOverdueTask(active, "moderate", "2026-08-28")).toBe(false);
    expect(isStrictOverdueTask({ ...active, completed: true }, "strict", "2026-08-28")).toBe(false);
  });
});
