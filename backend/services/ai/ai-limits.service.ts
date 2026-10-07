import { prisma } from "../../lib/prisma.js";
import type { User } from "@prisma/client";

export const DEFAULT_AI_REQUEST_LIMIT = 10;
export const AI_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const AI_LIMITS_BY_PLAN = {
  start: 10,
  focus: 70,
  forever: 70,
} as const;

type AiPlan = keyof typeof AI_LIMITS_BY_PLAN;
type AiPlanSource = Pick<User, "plan" | "subscriptionStatus" | "planExpiresAt">;
type AiLimitUser = Pick<
  User,
  | "aiRequestsCount"
  | "aiRequestsResetAt"
  | "plan"
  | "subscriptionStatus"
  | "planExpiresAt"
>;

export interface UserWhereInput {
  id: number;
  OR?: Array<{
    aiRequestsResetAt: null | { lte: Date };
  }>;
  aiRequestsResetAt?: Date;
  aiRequestsCount?: Record<string, number>;
}

export interface AiLimitUpdateData {
  aiRequestsCount?: number | { increment?: number; decrement?: number };
  aiRequestsResetAt?: Date;
  plan?: string;
  subscriptionStatus?: string;
}

const userLimitSelect = {
  aiRequestsCount: true,
  aiRequestsResetAt: true,
  plan: true,
  subscriptionStatus: true,
  planExpiresAt: true,
};

export interface AiLimitDb {
  user: {
    findUnique(args: { where: { id: number }; select: typeof userLimitSelect }): Promise<AiLimitUser | null>;
    update(args: {
      where: { id: number };
      data: AiLimitUpdateData;
      select: typeof userLimitSelect;
    }): Promise<AiLimitUser>;
    updateMany(args: {
      where: UserWhereInput;
      data: AiLimitUpdateData;
    }): Promise<{ count: number }>;
  };
}

const getSafeAiPlan = (plan: unknown): AiPlan => {
  if (plan === "focus" || plan === "forever") return plan;
  return "start";
};

const isExpiredFocusPlan = (
  user: AiPlanSource | null | undefined,
  currentTime = new Date()
): boolean =>
  Boolean(
    user?.plan === "focus" &&
      user?.subscriptionStatus === "active" &&
      user?.planExpiresAt &&
      user.planExpiresAt.getTime() < currentTime.getTime()
  );

const normalizeExpiredFocusPlan = async (
  db: AiLimitDb,
  userId: number,
  user: AiLimitUser,
  currentTime: Date
): Promise<AiLimitUser> => {
  if (!isExpiredFocusPlan(user, currentTime)) {
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

export const getEffectiveAiPlan = (
  user: AiPlanSource | null | undefined,
  currentTime = new Date()
): AiPlan => {
  if (!user) return "start";
  const plan = isExpiredFocusPlan(user, currentTime)
    ? "start"
    : getSafeAiPlan(user.plan);
  return plan;
};

export const getEffectiveAiLimit = (
  user: AiPlanSource | null | undefined,
  currentTime = new Date()
): number =>
  AI_LIMITS_BY_PLAN[getEffectiveAiPlan(user, currentTime)] ??
  DEFAULT_AI_REQUEST_LIMIT;

export const buildAiLimitPayload = (
  count: number,
  resetAt: Date,
  limit: number
) => ({
  limit,
  remaining: Math.max(0, limit - count),
  resetAt: resetAt.toISOString(),
});

const normalizeRequestCost = (cost: unknown): number =>
  typeof cost === "number" && Number.isInteger(cost) && cost > 0 ? cost : 1;

export const createAiLimitService = ({
  db = prisma as unknown as AiLimitDb,
  now = () => new Date(),
}: { db?: AiLimitDb; now?: () => Date } = {}) => {
  const readUser = (userId: number) =>
    db.user.findUnique({
      where: { id: userId },
      select: userLimitSelect,
    });

  const readNormalizedUser = async (userId: number, currentTime: Date) => {
    const rawUser = await readUser(userId);

    if (!rawUser) {
      throw new Error(`User ${userId} not found for AI usage check`);
    }

    return normalizeExpiredFocusPlan(db, userId, rawUser, currentTime);
  };

  const getUsage = async (userId: number) => {
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

  const readLimit = async (userId: number, requestCost: unknown = 1) => {
    const currentTime = now();
    const user = await readNormalizedUser(userId, currentTime);
    const isWindowExpired =
      !user.aiRequestsResetAt ||
      user.aiRequestsResetAt.getTime() <= currentTime.getTime();
    const currentCount = isWindowExpired ? 0 : user.aiRequestsCount;
    const resetAt = isWindowExpired
      ? new Date(currentTime.getTime() + AI_REQUEST_WINDOW_MS)
      : (user.aiRequestsResetAt ?? new Date(currentTime.getTime() + AI_REQUEST_WINDOW_MS));
    const limit = getEffectiveAiLimit(user, currentTime);
    const cost = normalizeRequestCost(requestCost);

    return {
      allowed: currentCount + cost <= limit,
      count: currentCount,
      resetAt,
      limit: buildAiLimitPayload(currentCount, resetAt, limit),
    };
  };

  const reserve = async (userId: number, requestCost: unknown = 1) => {
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
        : (user.aiRequestsResetAt ?? new Date(currentTime.getTime() + AI_REQUEST_WINDOW_MS));

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

  const release = async (reservation: AiReservation | null | undefined) => {
    if (!reservation) {
      return { released: false };
    }
    const { userId, cost } = reservation;
    const resetAt = new Date(reservation.resetAt);

    if (!Number.isSafeInteger(userId) || !Number.isInteger(cost) || cost <= 0 || Number.isNaN(resetAt.getTime())) {
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

export interface AiReservation {
  userId: number;
  cost: number;
  resetAt: string;
}

export const getAuthenticatedAiUsage = (userId: number) =>
  defaultAiLimitService.getUsage(userId);

export const createAiBurstLimiter = (service = defaultAiLimitService, clock = Date.now) => {
 const burstWindows = new Map<number, { until: number; count: number }>();
 return async (userId: number, requestCost = 1) => {
  const now = clock();
  for (const [id, window] of burstWindows) if (window.until <= now) burstWindows.delete(id);
  let window = burstWindows.get(userId);
  if (!window) {
    if (burstWindows.size >= 10_000) {
      const usage = await service.getUsage(userId);
      return { allowed: false, reservation: undefined, limit: { limit: usage.limit, remaining: usage.remaining, resetAt: new Date(now + 60_000).toISOString() } };
    }
    window = { until: now + 60_000, count: 0 };
    burstWindows.set(userId, window);
  }
  window.count += 1;
  if (window.count > 5) {
    const usage = await service.getUsage(userId);
    return { allowed: false, reservation: undefined, limit: { limit: usage.limit, remaining: usage.remaining, resetAt: new Date(window.until).toISOString() } };
  }
  return service.reserve(userId, requestCost);
 };
};

export const reserveAuthenticatedAiRequest = createAiBurstLimiter();

export const releaseAuthenticatedAiRequest = (
  reservation: AiReservation | null | undefined
) =>
  defaultAiLimitService.release(reservation);
