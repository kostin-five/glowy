import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateHabitStreak,
  calculateStreak,
  findRescueEligibleDate,
} from "../services/progress/progress.service.js";

test("calculates consecutive task days and keeps yesterday active", () => {
  const todayActive = calculateStreak({
    activeDates: ["2026-08-13", "2026-08-14", "2026-08-15"],
    today: "2026-08-15",
  });
  assert.equal(todayActive.current, 3);
  assert.equal(todayActive.longest, 3);
  assert.equal(todayActive.lastActiveOn, "2026-08-15");

  const yesterdayActive = calculateStreak({
    activeDates: ["2026-08-13", "2026-08-14"],
    today: "2026-08-15",
  });
  assert.equal(yesterdayActive.current, 2);
});

test("one confirmed rescue bridges a missed task day", () => {
  const activeDates = ["2026-08-12", "2026-08-13", "2026-08-15"];
  assert.equal(
    findRescueEligibleDate({ activeDates, today: "2026-08-15" }),
    "2026-08-14"
  );

  const protectedStreak = calculateStreak({
    activeDates,
    rescueDates: ["2026-08-14"],
    today: "2026-08-15",
  });
  assert.equal(protectedStreak.current, 4);
});

test("habit streak is independent and duplicate-safe", () => {
  assert.equal(
    calculateHabitStreak(
      ["2026-08-13", "2026-08-14", "2026-08-14", "2026-08-15"],
      "2026-08-15"
    ),
    3
  );
});
