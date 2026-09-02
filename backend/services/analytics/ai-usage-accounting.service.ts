import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { getEffectiveAiPlan } from "../ai/ai-limits.service.js";
import type { Prisma } from "@prisma/client";
import type {
  ProviderResult,
  ProviderUsage,
} from "../ai/ai-provider.service.js";

const readRate = (
  provider: string,
  direction: "INPUT" | "OUTPUT"
): number | null => {
  const key = `AI_COST_${provider.toUpperCase()}_${direction}_PER_MILLION_USD`;
  const raw = process.env[key];
  if (raw === undefined || raw === "") return null;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

interface AiUsageStore {
  user: {
    findUnique(input: {
      where: { id: number };
      select: {
        plan: true;
        subscriptionStatus: true;
        planExpiresAt: true;
      };
    }): PromiseLike<{
      plan: string;
      subscriptionStatus: string;
      planExpiresAt: Date | null;
    } | null>;
  };
  aiUsageDaily: {
    upsert(input: Prisma.AiUsageDailyUpsertArgs): PromiseLike<unknown>;
  };
}

export const calculateEstimatedCostMicrousd = ({
  provider,
  usage,
}: {
  provider: string;
  usage?: Partial<ProviderUsage> | null;
}): bigint | null => {
  const inputRate = readRate(provider, "INPUT");
  const outputRate = readRate(provider, "OUTPUT");
  if (inputRate === null || outputRate === null) return null;

  return BigInt(
    Math.round(
      (usage?.promptTokens || 0) * inputRate +
        (usage?.completionTokens || 0) * outputRate
    )
  );
};

export const recordSuccessfulAiUsage = async ({
  db = prisma,
  userId,
  result,
  now = new Date(),
}: {
  db?: AiUsageStore;
  userId: number;
  result: ProviderResult;
  now?: Date;
}): Promise<void> => {
  if (!userId || !result?.providerUsed) return;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, planExpiresAt: true },
  });
  if (!user) return;

  const provider = String(result.providerUsed).slice(0, 80);
  const model = String(result.modelUsed || "unknown").slice(0, 120);
  const promptTokens = Number(result.usage?.promptTokens) || 0;
  const completionTokens = Number(result.usage?.completionTokens) || 0;
  const totalTokens =
    Number(result.usage?.totalTokens) || promptTokens + completionTokens;
  const tokenizedRequests = totalTokens > 0 ? 1 : 0;
  const estimatedCostMicrousd = calculateEstimatedCostMicrousd({
    provider,
    usage: { promptTokens, completionTokens },
  });

  await db.aiUsageDaily.upsert({
    where: {
      userId_usageDate_plan_provider_model: {
        userId,
        usageDate: now.toISOString().slice(0, 10),
        plan: getEffectiveAiPlan(user),
        provider,
        model,
      },
    },
    create: {
      userId,
      usageDate: now.toISOString().slice(0, 10),
      plan: getEffectiveAiPlan(user),
      provider,
      model,
      requests: 1,
      tokenizedRequests,
      pricedRequests: estimatedCostMicrousd === null ? 0 : 1,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostMicrousd: estimatedCostMicrousd || 0n,
    },
    update: {
      requests: { increment: 1 },
      tokenizedRequests: { increment: tokenizedRequests },
      pricedRequests: { increment: estimatedCostMicrousd === null ? 0 : 1 },
      promptTokens: { increment: promptTokens },
      completionTokens: { increment: completionTokens },
      totalTokens: { increment: totalTokens },
      estimatedCostMicrousd: { increment: estimatedCostMicrousd || 0n },
    },
  });
};

export const recordSuccessfulAiUsageSafely = async (
  context: { userId?: number | null } | null | undefined,
  result: ProviderResult
): Promise<void> => {
  if (!context?.userId) return;

  try {
    await recordSuccessfulAiUsage({ userId: context.userId, result });
  } catch (error) {
    logger.error("ai.usage_accounting.failed", {
      error,
      statusCode: 500,
      errorCode: "AI_USAGE_ACCOUNTING_FAILED",
    });
  }
};
