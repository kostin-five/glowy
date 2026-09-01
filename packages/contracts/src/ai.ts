import { z } from "zod";
import {
  dateOnlySchema,
  energyLevelSchema,
  prioritySchema,
} from "./primitives.js";

const legacyAiDraftDateSchema = z
  .string()
  .regex(/^\d{1,2}\.\d{1,2}\.\d{4}$/)
  .transform((value, context) => {
    const [day, month, year] = value.split(".").map(Number);
    const normalized = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const result = dateOnlySchema.safeParse(normalized);

    if (!result.success) {
      context.addIssue({
        code: "custom",
        message: "Используйте корректную календарную дату",
      });
      return z.NEVER;
    }

    return result.data;
  });

export const aiDraftDateSchema = z.union([
  dateOnlySchema,
  legacyAiDraftDateSchema,
  z.literal(""),
]);

export const mindHubModeSchema = z.enum(["chat", "parse", "auto"]);

export const mindHubMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});

export const mindHubRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    hubMode: mindHubModeSchema.default("auto"),
    messages: z.array(mindHubMessageSchema).default([]),
    currentEnergy: z.number().finite().nullable().optional(),
  })
  .transform((value) => ({
    ...value,
    currentEnergy:
      typeof value.currentEnergy === "number"
        ? Math.min(100, Math.max(0, value.currentEnergy))
        : null,
  }));

export const mindHubLimitSchema = z.object({
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  resetAt: z.iso.datetime().nullable(),
});

export const aiUsageSchema = z.object({
  plan: z.enum(["demo", "start", "focus", "forever"]),
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});

export const mindHubDraftSubtaskSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false),
  position: z.number().int().nonnegative(),
});

export const mindHubDraftSchema = z.object({
  title: z.string().min(1),
  date: aiDraftDateSchema,
  priority: prioritySchema,
  category: z.string(),
  completed: z.boolean().default(false),
  energyLevel: energyLevelSchema,
  subtasks: z.array(mindHubDraftSubtaskSchema).default([]),
});

export const mindHubResponseSchema = z.object({
  drafts: z.array(mindHubDraftSchema),
  reply: z.string().nullable(),
  limit: mindHubLimitSchema.optional(),
  aiUnavailable: z.boolean().optional(),
  retryable: z.boolean().optional(),
  code: z.string().optional(),
});

export const aiLimitErrorSchema = z.object({
  error: z.string().min(1),
  limit: mindHubLimitSchema,
  code: z.string().optional(),
  requestId: z.string().optional(),
});

export type AiUsage = z.infer<typeof aiUsageSchema>;
export type MindHubDraft = z.infer<typeof mindHubDraftSchema>;
export type MindHubLimit = z.infer<typeof mindHubLimitSchema>;
export type MindHubMessage = z.infer<typeof mindHubMessageSchema>;
export type MindHubMode = z.infer<typeof mindHubModeSchema>;
export type MindHubRequest = z.infer<typeof mindHubRequestSchema>;
export type MindHubResponse = z.infer<typeof mindHubResponseSchema>;
