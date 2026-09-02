export interface PlanEntitlementSource {
  plan: string;
  subscriptionStatus: string;
  planExpiresAt: Date | null;
}

export const isActiveLifetimeEntitlement = (
  user: PlanEntitlementSource | null | undefined
): boolean =>
  user?.plan === "forever" &&
  user?.subscriptionStatus === "active" &&
  !user?.planExpiresAt;

type PublicPlanState = Pick<
  PlanEntitlementSource,
  "plan" | "subscriptionStatus" | "planExpiresAt"
>;

export function toPublicPlanState(user: null): null;
export function toPublicPlanState(user: undefined): undefined;
export function toPublicPlanState(user: PlanEntitlementSource): PublicPlanState;
export function toPublicPlanState(
  user: PlanEntitlementSource | null | undefined
): PublicPlanState | null | undefined {
  if (!user) return user;

  return {
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    planExpiresAt: user.planExpiresAt,
  };
}

export const isPaidForeverEnabled = () =>
  process.env.PAID_FOREVER_ENABLED === "true";
