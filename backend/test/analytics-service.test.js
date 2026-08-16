import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateAnalytics,
  buildAnalyticsInsightPrompt,
  getAnalyticsAccess,
  getAnalyticsPeriod,
} from "../services/analytics/analytics.service.js";

test("builds inclusive Monday-Sunday and calendar-month periods", () => {
  assert.deepEqual(getAnalyticsPeriod("week", "2026-08-16"), {
    kind: "week",
    from: "2026-08-10",
    to: "2026-08-16",
  });
  assert.deepEqual(getAnalyticsPeriod("month", "2024-02-12"), {
    kind: "month",
    from: "2024-02-01",
    to: "2024-02-29",
  });
  assert.throws(
    () => getAnalyticsPeriod("quarter", "2026-08-16"),
    /INVALID_ANALYTICS_PERIOD/
  );
});

test("aggregates completion, energy, streak and optional time without task text", () => {
  const period = getAnalyticsPeriod("week", "2026-08-16");
  const snapshot = aggregateAnalytics({
    period,
    anchor: "2026-08-16",
    periodTasks: [
      {
        completedOn: "2026-08-14",
        energyLevel: "low",
        estimatedMinutes: 30,
        actualMinutes: 45,
      },
      {
        completedOn: "2026-08-16",
        energyLevel: "high",
        estimatedMinutes: null,
        actualMinutes: 20,
      },
    ],
    allCompletedDates: ["2026-08-13", "2026-08-14", "2026-08-16"],
    rescueDates: ["2026-08-15"],
  });

  assert.equal(snapshot.completedTasks, 2);
  assert.deepEqual(snapshot.energyDistribution, { low: 1, med: 0, high: 1 });
  assert.equal(snapshot.taskStreak, 4);
  assert.deepEqual(snapshot.time, {
    estimatedMinutes: 30,
    actualMinutes: 65,
    tasksWithEstimate: 1,
    tasksWithActual: 2,
  });
  assert.equal(snapshot.dailyCompleted.length, 7);
  assert.equal(snapshot.dailyCompleted[4].completedTasks, 1);
  assert.equal(snapshot.dailyCompleted[6].completedTasks, 1);
});

test("requires premium entitlement for AI insight", () => {
  assert.equal(
    getAnalyticsAccess({
      plan: "start",
      subscriptionStatus: "inactive",
      planExpiresAt: null,
    }).canRequestAiInsight,
    false
  );
  assert.equal(
    getAnalyticsAccess({
      plan: "focus",
      subscriptionStatus: "active",
      planExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
    }).canRequestAiInsight,
    true
  );
  assert.equal(
    getAnalyticsAccess({
      plan: "forever",
      subscriptionStatus: "active",
      planExpiresAt: null,
    }).canRequestAiInsight,
    true
  );
});

test("analytics insight prompt contains aggregates but ignores extra user text", () => {
  const prompt = buildAnalyticsInsightPrompt({
    period: { kind: "week", from: "2026-08-10", to: "2026-08-16" },
    completedTasks: 3,
    dailyCompleted: [{ date: "2026-08-16", completedTasks: 3 }],
    energyDistribution: { low: 1, med: 2, high: 0 },
    taskStreak: 2,
    time: {
      estimatedMinutes: 60,
      actualMinutes: 75,
      tasksWithEstimate: 2,
      tasksWithActual: 2,
    },
    secretTaskTitle: "Секретное название задачи",
  });

  assert.match(prompt, /Выполнено задач: 3/);
  assert.match(prompt, /Что попробовать дальше/);
  assert.doesNotMatch(prompt, /Секретное название задачи/);
});
