import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  calculateEstimatedCostMicrousd,
  recordSuccessfulAiUsage,
} from "../services/analytics/ai-usage-accounting.service.js";

test("calculates provider cost in integer microdollars", () => {
  const previousInput = process.env.AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD;
  const previousOutput = process.env.AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD;
  process.env.AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD = "0.27";
  process.env.AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD = "1.10";

  try {
    assert.equal(
      calculateEstimatedCostMicrousd({
        provider: "deepseek",
        usage: { promptTokens: 1000, completionTokens: 200 },
      }),
      490n
    );
  } finally {
    if (previousInput === undefined) {
      delete process.env.AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD;
    } else {
      process.env.AI_COST_DEEPSEEK_INPUT_PER_MILLION_USD = previousInput;
    }
    if (previousOutput === undefined) {
      delete process.env.AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD;
    } else {
      process.env.AI_COST_DEEPSEEK_OUTPUT_PER_MILLION_USD = previousOutput;
    }
  }
});

test("upserts aggregate AI usage without storing prompts or responses", async () => {
  const calls: Prisma.AiUsageDailyUpsertArgs[] = [];
  const db = {
    user: {
      findUnique: async () => ({
        plan: "forever",
        subscriptionStatus: "active",
        planExpiresAt: null,
      }),
    },
    aiUsageDaily: {
      upsert: async (args: Prisma.AiUsageDailyUpsertArgs) => calls.push(args),
    },
  };

  await recordSuccessfulAiUsage({
    db,
    userId: 7,
    now: new Date("2026-08-16T12:00:00.000Z"),
    result: {
      providerUsed: "deepseek",
      modelUsed: "deepseek-chat",
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
      text: "Этот ответ не должен сохраняться",
    },
  });

  assert.equal(calls.length, 1);
  const call = calls[0]!;
  assert.deepEqual(call.where.userId_usageDate_plan_provider_model, {
    userId: 7,
    usageDate: "2026-08-16",
    plan: "forever",
    provider: "deepseek",
    model: "deepseek-chat",
  });
  assert.equal(call.create.requests, 1);
  assert.equal(call.create.totalTokens, 20);
  assert.equal("text" in call.create, false);
  assert.equal("prompt" in call.create, false);
  assert.equal("response" in call.create, false);
});
