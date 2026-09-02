import {
  isActiveLifetimeEntitlement,
  type PlanEntitlementSource,
} from "./billing/plan-entitlements.service.js";

export const isFocusEntitled = (
  user: PlanEntitlementSource | null | undefined,
  now = new Date()
): boolean => {
  if (!user || user.subscriptionStatus !== "active") return false;
  if (isActiveLifetimeEntitlement(user)) return true;
  if (user.plan !== "focus") return false;
  if (!user.planExpiresAt) return true;

  return new Date(user.planExpiresAt).getTime() > now.getTime();
};
