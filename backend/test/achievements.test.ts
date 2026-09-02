import assert from "node:assert/strict";
import test from "node:test";
import { reconcileAchievements } from "../services/progress/achievements.service.js";

test("concurrent achievement reconciliation requests idempotent inserts", async () => {
  type InsertedAchievement = { userId: number; key: string };
  let inserted: InsertedAchievement[] = [];
  const db = {
    achievement: {
      createMany: async ({
        data,
        skipDuplicates,
      }: {
        data: InsertedAchievement[];
        skipDuplicates: true;
      }) => {
        assert.equal(skipDuplicates, true);
        inserted = [...new Map([...inserted, ...data].map((item) => [item.key, item])).values()];
      },
      findMany: async () =>
        inserted.map((item, index) => ({
          id: index + 1,
          ...item,
          earnedAt: new Date("2026-08-16T00:00:00Z"),
        })),
    },
  };

  const input = {
    db,
    userId: 9,
    completedTaskCount: 5,
    taskStreak: 7,
    habitCount: 1,
  };
  const [first, second] = await Promise.all([
    reconcileAchievements(input),
    reconcileAchievements(input),
  ]);

  assert.equal(first.length, 12);
  assert.equal(second.length, 12);
  assert.deepEqual(
    second.filter((item) => item.earned).map((item) => item.key),
    ["tasks_1", "tasks_5", "streak_3", "streak_7", "first_habit"]
  );
  assert.equal(inserted.length, 5);
});
