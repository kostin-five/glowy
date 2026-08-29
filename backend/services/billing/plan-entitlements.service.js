export const isActiveLifetimeEntitlement = (user) =>
  user?.plan === "forever" &&
  user?.subscriptionStatus === "active" &&
  !user?.planExpiresAt;

export const toPublicPlanState = (user) => {
  if (!user) return user;

  return {
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    planExpiresAt: user.planExpiresAt,
  };
};

export const isPaidForeverEnabled = () =>
  process.env.PAID_FOREVER_ENABLED === "true";
