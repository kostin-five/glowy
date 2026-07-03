export const AUTHENTICATED_AI_REQUEST_LIMIT = 25;
export const AI_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;

import { prisma } from "../../lib/prisma.js";

export const buildAiLimitPayload = (count, resetAt) => ({
  limit: AUTHENTICATED_AI_REQUEST_LIMIT,
  remaining: Math.max(0, AUTHENTICATED_AI_REQUEST_LIMIT - count),
  resetAt: resetAt.toISOString(),
});

export const getAuthenticatedAiRequestLimit = async (userId) => {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiRequestsCount: true,
      aiRequestsResetAt: true,
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

  if (currentCount >= AUTHENTICATED_AI_REQUEST_LIMIT) {
    return {
      allowed: false,
      limit: buildAiLimitPayload(currentCount, resetAt),
    };
  }

  return {
    allowed: true,
    count: currentCount,
    resetAt,
    limit: buildAiLimitPayload(currentCount, resetAt),
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

  return {
    allowed: true,
    limit: buildAiLimitPayload(
      updatedUser.aiRequestsCount,
      updatedUser.aiRequestsResetAt
    ),
  };
};
