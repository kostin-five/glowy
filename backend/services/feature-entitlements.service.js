import { isActiveLifetimeEntitlement } from "./billing/plan-entitlements.service.js";

export const isFocusEntitled = (user, now = new Date()) => {
  if (!user || user.subscriptionStatus !== "active") return false;
  if (isActiveLifetimeEntitlement(user)) return true;
  if (user.plan !== "focus") return false;
  if (!user.planExpiresAt) return true;

  return new Date(user.planExpiresAt).getTime() > now.getTime();
};
