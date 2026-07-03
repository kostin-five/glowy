export const DEFAULT_AI_REQUEST_LIMIT = 10;
export const AI_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;

import { prisma } from "../../lib/prisma.js";

export const getEffectiveAiLimit = (user) => {
  const now = new Date();
  const isExpired = user.planExpiresAt && user.planExpiresAt < now;
  const plan = isExpired ? "start" : user.plan;

  if (plan === "focus") return 100;
  if (plan === "forever") return 150;
  return DEFAULT_AI_REQUEST_LIMIT;
};

export const buildAiLimitPayload = (count, resetAt, limit) => ({
  limit,
  remaining: Math.max(0, limit - count),
  resetAt: resetAt.toISOString(),
});

export const getAuthenticatedAiRequestLimit = async (userId) => {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiRequestsCount: true,
      aiRequestsResetAt: true,
      plan: true,
      planExpiresAt: true,
    },
  });

  if (!user) {
    throw new Error(`User ${userId} not found for AI limit check`);
  }

  const isWindowExpired =
    !user.aiRequestsResetAt ||
    user.aiRequestsResetAt.getTime() <= now.getTime();
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
