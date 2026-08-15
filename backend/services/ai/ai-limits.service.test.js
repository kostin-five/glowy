import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_LIMITS_BY_PLAN,
  getEffectiveAiLimit,
} from "./ai-limits.service.js";

test("retains 100 daily AI requests for legacy lifetime entitlements", () => {
  const founderStoredAsForever = {
    plan: "forever",
    subscriptionStatus: "active",
    planExpiresAt: null,
  };

  assert.equal(AI_LIMITS_BY_PLAN.founder, 100);
  assert.equal(getEffectiveAiLimit(founderStoredAsForever), 100);
});
