import assert from "node:assert/strict";
import test from "node:test";
import {
  isFounderEntitlement,
  isFounderSignupEnabled,
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

test("commercial flags are disabled unless explicitly enabled", () => {
  const originalFounder = process.env.FOUNDER_SIGNUP_ENABLED;
  const originalForever = process.env.PAID_FOREVER_ENABLED;
  delete process.env.FOUNDER_SIGNUP_ENABLED;
  delete process.env.PAID_FOREVER_ENABLED;

  try {
    assert.equal(isFounderSignupEnabled(), false);
    assert.equal(isPaidForeverEnabled(), false);
  } finally {
    if (originalFounder === undefined) delete process.env.FOUNDER_SIGNUP_ENABLED;
    else process.env.FOUNDER_SIGNUP_ENABLED = originalFounder;
    if (originalForever === undefined) delete process.env.PAID_FOREVER_ENABLED;
    else process.env.PAID_FOREVER_ENABLED = originalForever;
  }
});
