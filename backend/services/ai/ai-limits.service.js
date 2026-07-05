import { prisma } from "../../lib/prisma.js";

export const DEFAULT_AI_REQUEST_LIMIT = 10;
export const AI_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AI_LIMITS_BY_PLAN = {
  start: 10,
  focus: 100,
  forever: 100,
};

const getSafeAiPlan = (plan) => {
  if (plan === "focus" || plan === "forever") return plan;
  return "start";
};

const isExpiredFocusPlan = (user) =>
  user?.plan === "focus" &&
  user?.subscriptionStatus === "active" &&
  user?.planExpiresAt &&
  user.planExpiresAt.getTime() < Date.now();

const normalizeExpiredFocusPlan = async (userId, user) => {
  if (!user || !isExpiredFocusPlan(user)) {
    return user;
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      plan: "start",
      subscriptionStatus: "expired",
    },
    select: {
      aiRequestsCount: true,
      aiRequestsResetAt: true,
      plan: true,
      subscriptionStatus: true,
      planExpiresAt: true,
    },
  });
};

export const getEffectiveAiPlan = (user) => {
  if (!user) return "start";
  const plan = isExpiredFocusPlan(user) ? "start" : getSafeAiPlan(user.plan);
  return plan;
};

export const getEffectiveAiLimit = (user) =>
  AI_LIMITS_BY_PLAN[getEffectiveAiPlan(user)] ?? DEFAULT_AI_REQUEST_LIMIT;

export const buildAiLimitPayload = (count, resetAt, limit) => ({
  limit,
  remaining: Math.max(0, limit - count),
  resetAt: resetAt.toISOString(),
});

export const getAuthenticatedAiUsage = async (userId) => {
  const now = new Date();
  const rawUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiRequestsCount: true,
      aiRequestsResetAt: true,
      plan: true,
      subscriptionStatus: true,
      planExpiresAt: true,
    },
  });

  if (!rawUser) {
    throw new Error(`User ${userId} not found for AI usage check`);
  }

  const user = await normalizeExpiredFocusPlan(userId, rawUser);
  const isWindowExpired =
    !user.aiRequestsResetAt || user.aiRequestsResetAt.getTime() <= now.getTime();
  const used = isWindowExpired ? 0 : user.aiRequestsCount;
  const plan = getEffectiveAiPlan(user);
  const limit = AI_LIMITS_BY_PLAN[plan] ?? DEFAULT_AI_REQUEST_LIMIT;

  return {
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
};

export const getAuthenticatedAiRequestLimit = async (userId) => {
  const now = new Date();
  const rawUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiRequestsCount: true,
      aiRequestsResetAt: true,
      plan: true,
      subscriptionStatus: true,
      planExpiresAt: true,
    },
  });

  if (!rawUser) {
    throw new Error(`User ${userId} not found for AI limit check`);
  }

  const user = await normalizeExpiredFocusPlan(userId, rawUser);
  const isWindowExpired =
    !user.aiRequestsResetAt || user.aiRequestsResetAt.getTime() <= now.getTime();
  const currentCount = isWindowExpired ? 0 : user.aiRequestsCount;
  const resetAt = isWindowExpired
    ? new Date(now.getTime() + AI_REQUEST_WINDOW_MS)
    : user.aiRequestsResetAt;

  const limit = getEffectiveAiLimit(user);

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit: buildAiLimitPayload(currentCount, resetAt, limit),
    };
  }

  return {
    allowed: true,
    count: currentCount,
    resetAt,
    limit: buildAiLimitPayload(currentCount, resetAt, limit),
  };
};

export const consumeAuthenticatedAiRequest = async (userId) => {
  const currentLimit = await getAuthenticatedAiRequestLimit(userId);

  if (!currentLimit.allowed) {
    return currentLimit;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      aiRequestsCount: currentLimit.count + 1,
      aiRequestsResetAt: currentLimit.resetAt,
    },
    select: {
      aiRequestsCount: true,
      aiRequestsResetAt: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  const limit = getEffectiveAiLimit(user);

  return {
    allowed: true,
    limit: buildAiLimitPayload(
      updatedUser.aiRequestsCount,
      updatedUser.aiRequestsResetAt,
      limit
    ),
  };
};
