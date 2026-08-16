import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { getEffectiveAiPlan } from "../ai/ai-limits.service.js";

const readRate = (provider, direction) => {
  const key = `AI_COST_${provider.toUpperCase()}_${direction}_PER_MILLION_USD`;
  const raw = process.env[key];
  if (raw === undefined || raw === "") return null;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export const calculateEstimatedCostMicrousd = ({ provider, usage }) => {
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
}) => {
  if (!userId || !result?.providerUsed) return;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, planExpiresAt: true },
  });
  if (!user) return;

  const provider = String(result.providerUsed).slice(0, 80);
  const model = String(result.modelUsed || "unknown").slice(0, 120);
  const usage = result.usage || {};
  const promptTokens = Number(usage.promptTokens) || 0;
  const completionTokens = Number(usage.completionTokens) || 0;
  const totalTokens = Number(usage.totalTokens) || promptTokens + completionTokens;
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

export const recordSuccessfulAiUsageSafely = async (context, result) => {
  if (!context?.userId) return;

  try {
    await recordSuccessfulAiUsage({ userId: context.userId, result });
  } catch (error) {
    logger.error("ai.usage_accounting.failed", {
      error,
      userId: context.userId,
      provider: result?.providerUsed || null,
      model: result?.modelUsed || null,
    });
  }
};
