import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateHabitStreak,
  calculateStreak,
  buildRhythmCalendar,
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

test("rescue eligibility is exactly yesterday after an existing streak", () => {
  assert.equal(findRescueEligibleDate({
    activeDates: ["2026-08-20", "2026-08-22"],
    today: "2026-08-23",
  }), null);
  assert.equal(findRescueEligibleDate({
    activeDates: ["2026-08-20", "2026-08-21"],
    today: "2026-08-23",
  }), "2026-08-22");
  assert.equal(findRescueEligibleDate({
    activeDates: ["2026-08-21", "2026-08-22"],
    today: "2026-08-23",
  }), null);
});

test("builds a bounded Monday-first rhythm calendar with distinct states", () => {
  const calendar = buildRhythmCalendar({
    month: "2024-02",
    today: "2024-02-15",
    accountCreatedOn: "2024-02-03",
    activeDates: ["2024-02-10"],
    rescueDates: ["2024-02-11"],
  });

  assert.equal(calendar.from, "2024-01-29");
  assert.equal(calendar.to, "2024-03-03");
  assert.equal(calendar.days.length, 35);
  assert.equal(calendar.days.find((day) => day.date === "2024-02-10")!.state, "active");
  assert.equal(calendar.days.find((day) => day.date === "2024-02-11")!.state, "rescued");
  assert.equal(calendar.days.find((day) => day.date === "2024-02-15")!.state, "today");
  assert.equal(calendar.days.find((day) => day.date === "2024-02-02")!.state, "empty");
  assert.equal(calendar.days.find((day) => day.date === "2024-02-16")!.state, "future");
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
