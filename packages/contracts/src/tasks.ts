import { z } from "zod";
import { contractErrorSchema } from "./common.js";
import {
  dateOnlySchema,
  energyLevelSchema,
  optionalMinutesSchema,
  optionalTaskDateSchema,
  positiveIdSchema,
  prioritySchema,
} from "./primitives.js";

const serializedDateTimeSchema = z.union([
  z.iso.datetime(),
  z.date().transform((value) => value.toISOString()),
]);

export const subTaskSchema = z.object({
  id: positiveIdSchema,
  taskId: positiveIdSchema,
  title: z.string().min(1).max(255),
  completed: z.boolean(),
  position: z.number().int().nonnegative().default(0),
  createdAt: serializedDateTimeSchema.optional(),
  updatedAt: serializedDateTimeSchema.optional(),
});

export const subTaskDraftSchema = z.object({
  title: z.string().trim().min(1).max(255),
  completed: z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
});

const noteLinkSchema = z.object({
  id: positiveIdSchema,
  note: z.object({
    id: positiveIdSchema,
    title: z.string(),
    archived: z.boolean(),
  }),
});

export const taskSchema = z.object({
  id: positiveIdSchema,
  userId: positiveIdSchema.optional(),
  title: z.string().min(1).max(255),
  date: optionalTaskDateSchema,
  priority: prioritySchema,
  category: z.string().max(100),
  completed: z.boolean(),
  completedOn: dateOnlySchema.nullable().default(null),
  xpAwarded: z.boolean().default(false),
  energyLevel: energyLevelSchema,
  estimatedMinutes: optionalMinutesSchema.default(null),
  actualMinutes: optionalMinutesSchema.default(null),
  createdAt: serializedDateTimeSchema.optional(),
  updatedAt: serializedDateTimeSchema.optional(),
  subtasks: z.array(subTaskSchema).default([]),
  noteLinks: z.array(noteLinkSchema).optional(),
});

export const taskDraftSchema = taskSchema
  .omit({
    id: true,
    userId: true,
    completed: true,
    completedOn: true,
    actualMinutes: true,
    xpAwarded: true,
    createdAt: true,
    updatedAt: true,
    subtasks: true,
    noteLinks: true,
  })
  .extend({
    id: positiveIdSchema.optional(),
    completed: z.boolean().default(false),
    estimatedMinutes: optionalMinutesSchema.optional(),
    subtasks: z.array(subTaskDraftSchema).default([]),
  });

export const taskCreateRequestSchema = taskDraftSchema
  .omit({ id: true, completed: true })
  .extend({ actualMinutes: optionalMinutesSchema.optional() });

export const taskUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  date: optionalTaskDateSchema.optional(),
  priority: prioritySchema.optional(),
  category: z.string().max(100).optional(),
  completed: z.boolean().optional(),
  completedOn: dateOnlySchema.nullable().optional(),
  energyLevel: energyLevelSchema.optional(),
  estimatedMinutes: optionalMinutesSchema.optional(),
  actualMinutes: optionalMinutesSchema.optional(),
  subtasks: z.array(z.object({ id: positiveIdSchema }).passthrough()).optional(),
});

export const userProgressSchema = z.object({
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
});

export const taskCompletionOutcomeSchema = z.object({
  effect: z.enum(["awarded", "withheld", "deducted", "unchanged"]),
  amount: z.number().int().nonnegative(),
  reason: z.enum(["normal", "overdue_blocker", "already_processed"]),
});

export const taskUpdateResponseSchema = z.object({
  task: taskSchema,
  xpReward: z.number().int(),
  xpOutcome: taskCompletionOutcomeSchema.nullable().optional(),
  userProgress: userProgressSchema.nullable(),
});

export const subTaskCreateRequestSchema = z.object({
  taskId: positiveIdSchema,
  title: z.string().trim().min(1).max(255),
});

export const subTaskUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    completed: z.boolean().optional(),
    position: z.number().int().nonnegative().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export const taskDeleteResponseSchema = z.object({
  message: z.literal("Удалено"),
});

export const taskErrorSchema = contractErrorSchema;

export type SubTask = z.infer<typeof subTaskSchema>;
export type SubTaskDraft = z.infer<typeof subTaskDraftSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskCompletionOutcome = z.infer<typeof taskCompletionOutcomeSchema>;
export type TaskDraft = z.infer<typeof taskDraftSchema>;
export type TaskUpdateResponse = z.infer<typeof taskUpdateResponseSchema>;
export type UserProgress = z.infer<typeof userProgressSchema>;
