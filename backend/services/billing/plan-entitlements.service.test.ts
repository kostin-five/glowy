import assert from "node:assert/strict";
import test from "node:test";
import {
  isActiveLifetimeEntitlement,
  isPaidForeverEnabled,
  toPublicPlanState,
} from "./plan-entitlements.service.js";

const foreverUser = {
  plan: "forever",
  subscriptionStatus: "active",
  planExpiresAt: null,
};

test("keeps an active lifetime entitlement public as Forever", () => {
  assert.equal(isActiveLifetimeEntitlement(foreverUser), true);
  assert.deepEqual(toPublicPlanState(foreverUser), {
    plan: "forever",
    subscriptionStatus: "active",
    planExpiresAt: null,
  });
});

test("does not change Forever based on payment history", () => {
  assert.equal(toPublicPlanState(foreverUser).plan, "forever");
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
