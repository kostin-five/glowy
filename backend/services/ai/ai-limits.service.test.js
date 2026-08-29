import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_LIMITS_BY_PLAN,
  getEffectiveAiLimit,
} from "./ai-limits.service.js";

test("retains 100 daily AI requests for Forever", () => {
  const foreverUser = {
    plan: "forever",
    subscriptionStatus: "active",
    planExpiresAt: null,
  };

  assert.equal(AI_LIMITS_BY_PLAN.forever, 100);
  assert.deepEqual(Object.keys(AI_LIMITS_BY_PLAN), ["start", "focus", "forever"]);
  assert.equal(getEffectiveAiLimit(foreverUser), 100);
});
