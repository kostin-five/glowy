import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_LIMITS_BY_PLAN,
  createAiLimitService,
  createAiBurstLimiter,
  getEffectiveAiLimit,
} from "./ai-limits.service.js";
import type {
  AiLimitDb,
  AiLimitUpdateData,
  UserWhereInput,
} from "./ai-limits.service.js";

interface MemoryDbOptions {
  count?: number;
  resetAt?: Date | null;
}

test("burst limit rejects request six without reserving quota and resets after a minute", async () => {
  let calls = 0;
  let time = 1_000;
  const reserve = createAiBurstLimiter({
    reserve: async () => { calls++; return { allowed: true }; },
    getUsage: async () => ({ limit: 10, remaining: 5 }),
  } as never, () => time);
  for (let i = 0; i < 5; i++) assert.equal((await reserve(42)).allowed, true);
  assert.equal((await reserve(42)).allowed, false);
  assert.equal(calls, 5);
  assert.equal((await reserve(43)).allowed, true);
  time += 60_000;
  assert.equal((await reserve(42)).allowed, true);
});

const createMemoryDb = ({ count = 0, resetAt }: MemoryDbOptions = {}) => {
  const state = {
    id: 42,
    aiRequestsCount: count,
    aiRequestsResetAt: resetAt ?? new Date("2026-08-31T12:00:00.000Z"),
    plan: "start",
    subscriptionStatus: "active",
    planExpiresAt: null,
  };
  const matchesWhere = (where: UserWhereInput) => {
    if (where.id !== state.id) return false;
    if (where.aiRequestsResetAt instanceof Date) {
      if (state.aiRequestsResetAt?.getTime() !== where.aiRequestsResetAt.getTime()) {
        return false;
      }
    }
    if (
      where.aiRequestsCount?.lte !== undefined &&
      state.aiRequestsCount > where.aiRequestsCount.lte
    ) {
      return false;
    }
    if (
      where.aiRequestsCount?.gte !== undefined &&
      state.aiRequestsCount < where.aiRequestsCount.gte
    ) {
      return false;
    }
    if (where.OR) {
      const matchesReset = where.OR.some((condition) => {
        if (condition.aiRequestsResetAt === null) {
          return state.aiRequestsResetAt === null;
        }
        return (
          condition.aiRequestsResetAt?.lte instanceof Date &&
          state.aiRequestsResetAt?.getTime() <=
            condition.aiRequestsResetAt.lte.getTime()
        );
      });
      if (!matchesReset) return false;
    }
    return true;
  };
  const applyData = (data: AiLimitUpdateData) => {
    if (typeof data.aiRequestsCount === "number") {
      state.aiRequestsCount = data.aiRequestsCount;
    } else if (data.aiRequestsCount?.increment) {
      state.aiRequestsCount += data.aiRequestsCount.increment;
    } else if (data.aiRequestsCount?.decrement) {
      state.aiRequestsCount -= data.aiRequestsCount.decrement;
    }
    if (data.aiRequestsResetAt instanceof Date) {
      state.aiRequestsResetAt = data.aiRequestsResetAt;
    }
  };

  const db: AiLimitDb = {
    user: {
      findUnique: async () => ({ ...state }),
      update: async ({ data }) => {
        Object.assign(state, data);
        return { ...state };
      },
      updateMany: async ({ where, data }) => {
        if (!matchesWhere(where)) return { count: 0 };
        applyData(data);
        return { count: 1 };
      },
    },
  };

  return {
    state,
    db,
  };
};

test("uses the 30 request daily limit for Focus and lifetime plans", () => {
  const foreverUser = {
    plan: "forever",
    subscriptionStatus: "active",
    planExpiresAt: null,
  };

  assert.equal(AI_LIMITS_BY_PLAN.focus, 30);
  assert.equal(AI_LIMITS_BY_PLAN.forever, 30);
  assert.deepEqual(Object.keys(AI_LIMITS_BY_PLAN), ["start", "focus", "forever"]);
  assert.equal(getEffectiveAiLimit(foreverUser), 30);
});

test("allows exactly one of 20 concurrent reservations with one unit left", async () => {
  const { db, state } = createMemoryDb({ count: AI_LIMITS_BY_PLAN.start - 1 });
  const limits = createAiLimitService({
    db,
    now: () => new Date("2026-08-31T10:00:00.000Z"),
  });

  const results = await Promise.all(
    Array.from({ length: 20 }, () => limits.reserve(42))
  );

  assert.equal(results.filter((result) => result.allowed).length, 1);
  assert.equal(state.aiRequestsCount, 5);
});

test("releases a reservation only inside its original quota window", async () => {
  const { db, state } = createMemoryDb({ count: 3 });
  const limits = createAiLimitService({
    db,
    now: () => new Date("2026-08-31T10:00:00.000Z"),
  });
  const reservation = await limits.reserve(42);

  assert.equal(reservation.allowed, true);
  assert.ok(reservation.reservation);
  assert.equal((await limits.release(reservation.reservation)).released, true);
  assert.equal(state.aiRequestsCount, 3);

  state.aiRequestsCount = 1;
  state.aiRequestsResetAt = new Date("2026-09-01T12:00:00.000Z");
  assert.equal((await limits.release(reservation.reservation)).released, false);
  assert.equal(state.aiRequestsCount, 1);
});
