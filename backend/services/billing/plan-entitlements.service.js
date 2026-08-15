export const isActiveLifetimeEntitlement = (user) =>
  user?.plan === "forever" &&
  user?.subscriptionStatus === "active" &&
  !user?.planExpiresAt;

export const isFounderEntitlement = (user, hasPaidForeverPayment = false) =>
  isActiveLifetimeEntitlement(user) && !hasPaidForeverPayment;

export const toPublicPlanState = (user, hasPaidForeverPayment = false) => {
  if (!user) return user;

  return {
    plan: isFounderEntitlement(user, hasPaidForeverPayment)
      ? "founder"
      : user.plan,
    subscriptionStatus: user.subscriptionStatus,
    planExpiresAt: user.planExpiresAt,
  };
};

export const isPaidForeverEnabled = () =>
  process.env.PAID_FOREVER_ENABLED === "true";
