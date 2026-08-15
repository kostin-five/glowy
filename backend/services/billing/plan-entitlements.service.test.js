import assert from "node:assert/strict";
import test from "node:test";
import {
  isFounderEntitlement,
  isPaidForeverEnabled,
  toPublicPlanState,
} from "./plan-entitlements.service.js";

const founderUser = {
  plan: "forever",
  subscriptionStatus: "active",
  planExpiresAt: null,
};

test("maps a legacy free lifetime entitlement to Founder", () => {
  assert.equal(isFounderEntitlement(founderUser), true);
  assert.deepEqual(toPublicPlanState(founderUser), {
    plan: "founder",
    subscriptionStatus: "active",
    planExpiresAt: null,
  });
});

test("does not relabel a paid Forever entitlement", () => {
  assert.equal(isFounderEntitlement(founderUser, true), false);
  assert.equal(toPublicPlanState(founderUser, true).plan, "forever");
});

test("paid Forever remains disabled unless explicitly enabled", () => {
  const originalForever = process.env.PAID_FOREVER_ENABLED;
  delete process.env.PAID_FOREVER_ENABLED;

  try {
    assert.equal(isPaidForeverEnabled(), false);
  } finally {
    if (originalForever === undefined) delete process.env.PAID_FOREVER_ENABLED;
    else process.env.PAID_FOREVER_ENABLED = originalForever;
  }
});
