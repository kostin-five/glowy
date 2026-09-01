import { prisma } from "../../lib/prisma.js";

export const DEFAULT_AI_REQUEST_LIMIT = 10;
export const AI_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AI_LIMITS_BY_PLAN = {
  start: 10,
  focus: 70,
  forever: 70,
};

const getSafeAiPlan = (plan) => {
  if (plan === "focus" || plan === "forever") return plan;
  return "start";
};

const isExpiredFocusPlan = (user, currentTime = new Date()) =>
  user?.plan === "focus" &&
  user?.subscriptionStatus === "active" &&
  user?.planExpiresAt &&
  user.planExpiresAt.getTime() < currentTime.getTime();

const normalizeExpiredFocusPlan = async (db, userId, user, currentTime) => {
  if (!user || !isExpiredFocusPlan(user, currentTime)) {
    return user;
  }

  return db.user.update({
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

export const getEffectiveAiPlan = (user, currentTime = new Date()) => {
  if (!user) return "start";
  const plan = isExpiredFocusPlan(user, currentTime)
    ? "start"
    : getSafeAiPlan(user.plan);
  return plan;
};

export const getEffectiveAiLimit = (user, currentTime = new Date()) =>
  AI_LIMITS_BY_PLAN[getEffectiveAiPlan(user, currentTime)] ??
  DEFAULT_AI_REQUEST_LIMIT;

export const buildAiLimitPayload = (count, resetAt, limit) => ({
  limit,
  remaining: Math.max(0, limit - count),
  resetAt: resetAt.toISOString(),
});

const normalizeRequestCost = (cost) =>
  Number.isInteger(cost) && cost > 0 ? cost : 1;

const userLimitSelect = {
  aiRequestsCount: true,
  aiRequestsResetAt: true,
  plan: true,
  subscriptionStatus: true,
  planExpiresAt: true,
};

export const createAiLimitService = ({
  db = prisma,
  now = () => new Date(),
} = {}) => {
  const readUser = (userId) =>
    db.user.findUnique({
      where: { id: userId },
      select: userLimitSelect,
    });

  const readNormalizedUser = async (userId, currentTime) => {
    const rawUser = await readUser(userId);

    if (!rawUser) {
      throw new Error(`User ${userId} not found for AI usage check`);
    }

    return normalizeExpiredFocusPlan(db, userId, rawUser, currentTime);
  };

  const getUsage = async (userId) => {
    const currentTime = now();
    const user = await readNormalizedUser(userId, currentTime);
    const isWindowExpired =
      !user.aiRequestsResetAt ||
      user.aiRequestsResetAt.getTime() <= currentTime.getTime();
    const used = isWindowExpired ? 0 : user.aiRequestsCount;
    const plan = getEffectiveAiPlan(user, currentTime);
    const limit = AI_LIMITS_BY_PLAN[plan] ?? DEFAULT_AI_REQUEST_LIMIT;

    return {
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  };

  const readLimit = async (userId, requestCost = 1) => {
    const currentTime = now();
    const user = await readNormalizedUser(userId, currentTime);
    const isWindowExpired =
      !user.aiRequestsResetAt ||
      user.aiRequestsResetAt.getTime() <= currentTime.getTime();
    const currentCount = isWindowExpired ? 0 : user.aiRequestsCount;
    const resetAt = isWindowExpired
      ? new Date(currentTime.getTime() + AI_REQUEST_WINDOW_MS)
      : user.aiRequestsResetAt;
    const limit = getEffectiveAiLimit(user, currentTime);
    const cost = normalizeRequestCost(requestCost);

    return {
      allowed: currentCount + cost <= limit,
      count: currentCount,
      resetAt,
      limit: buildAiLimitPayload(currentCount, resetAt, limit),
    };
  };

  const reserve = async (userId, requestCost = 1) => {
    const cost = normalizeRequestCost(requestCost);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const currentTime = now();
      const user = await readNormalizedUser(userId, currentTime);
      const limit = getEffectiveAiLimit(user, currentTime);
      const isWindowExpired =
        !user.aiRequestsResetAt ||
        user.aiRequestsResetAt.getTime() <= currentTime.getTime();
      const resetAt = isWindowExpired
        ? new Date(currentTime.getTime() + AI_REQUEST_WINDOW_MS)
        : user.aiRequestsResetAt;

      if (cost > limit) {
        return {
          allowed: false,
          limit: buildAiLimitPayload(
            isWindowExpired ? 0 : user.aiRequestsCount,
            resetAt,
            limit
          ),
        };
      }

      const result = isWindowExpired
        ? await db.user.updateMany({
            where: {
              id: userId,
              OR: [
                { aiRequestsResetAt: null },
                { aiRequestsResetAt: { lte: currentTime } },
              ],
            },
            data: {
              aiRequestsCount: cost,
              aiRequestsResetAt: resetAt,
            },
          })
        : await db.user.updateMany({
            where: {
              id: userId,
              aiRequestsResetAt: resetAt,
              aiRequestsCount: { lte: limit - cost },
            },
            data: { aiRequestsCount: { increment: cost } },
          });

      if (result.count === 1) {
        const updatedUser = await readUser(userId);
        const count = updatedUser?.aiRequestsCount ??
          (isWindowExpired ? cost : user.aiRequestsCount + cost);

        return {
          allowed: true,
          limit: buildAiLimitPayload(count, resetAt, limit),
          reservation: {
            userId,
            cost,
            resetAt: resetAt.toISOString(),
          },
        };
      }
    }

    const current = await readLimit(userId, cost);
    return { allowed: false, limit: current.limit };
  };

  const release = async (reservation) => {
    const userId = reservation?.userId;
    const cost = reservation?.cost;
    const resetAt = new Date(reservation?.resetAt);

    if (
      !Number.isSafeInteger(userId) ||
      !Number.isInteger(cost) ||
      cost <= 0 ||
      Number.isNaN(resetAt.getTime())
    ) {
      return { released: false };
    }

    const result = await db.user.updateMany({
      where: {
        id: userId,
        aiRequestsResetAt: resetAt,
        aiRequestsCount: { gte: cost },
      },
      data: { aiRequestsCount: { decrement: cost } },
    });

    const user = await readUser(userId);
    const limit = user
      ? buildAiLimitPayload(
          user.aiRequestsCount,
          user.aiRequestsResetAt ?? resetAt,
          getEffectiveAiLimit(user, now())
        )
      : undefined;

    return { released: result.count === 1, limit };
  };

  return { getUsage, reserve, release };
};

const defaultAiLimitService = createAiLimitService();

export const getAuthenticatedAiUsage = (userId) =>
  defaultAiLimitService.getUsage(userId);

export const reserveAuthenticatedAiRequest = (userId, requestCost = 1) =>
  defaultAiLimitService.reserve(userId, requestCost);

export const releaseAuthenticatedAiRequest = (reservation) =>
  defaultAiLimitService.release(reservation);
