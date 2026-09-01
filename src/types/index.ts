import { z } from "zod";
import {
  subTaskDraftSchema as sharedSubTaskDraftSchema,
  subTaskSchema as sharedSubTaskSchema,
  taskCompletionOutcomeSchema as sharedTaskCompletionOutcomeSchema,
  taskDraftSchema as sharedTaskDraftSchema,
  taskSchema as sharedTaskSchema,
  taskUpdateResponseSchema as sharedTaskUpdateResponseSchema,
  userProgressSchema as sharedUserProgressSchema,
} from "@glowy/contracts";
import { aiTones, avatarIds } from "../constants/profile";

export type Priority = "🔥 P1" | "⚡️ P2" | "💤 P3";
export type EnergyLevel = "low" | "med" | "high";
export type FilterStatus = "Все" | "Активные" | "Выполненные";
export type SortField =
  | "date"
  | "energy"
  | "title"
  | "category"
  | "priority"
  | null;
export type SortDirection = "asc" | "desc";

export const schemaSubTask = sharedSubTaskSchema;
export const schemaSubTaskDraft = sharedSubTaskDraftSchema;
export const schemaTask = sharedTaskSchema;
export const schemaTaskDraft = sharedTaskDraftSchema;

export const schemaAuthData = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export const schemaLoginData = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const schemaUserProgress = sharedUserProgressSchema;
export const schemaTaskCompletionOutcome = sharedTaskCompletionOutcomeSchema;
export const schemaTaskUpdateResponse = sharedTaskUpdateResponseSchema;

export const schemaAvatarId = z.enum(avatarIds);
export const schemaAiTone = z.enum(aiTones);
export const schemaUserPreferences = z.object({
  avatarId: schemaAvatarId,
  aiTone: schemaAiTone,
  focusBetaEnabled: z.boolean(),
  canUseFocusFeatures: z.boolean(),
  focusBetaAvailable: z.boolean(),
});

export const schemaUserPreferencesPatch = z
  .object({
    avatarId: schemaAvatarId.optional(),
    aiTone: schemaAiTone.optional(),
    focusBetaEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export const schemaTelegramConnectionStatus = z.object({
  available: z.boolean(),
  botUsername: z.string().nullable(),
  connected: z.boolean(),
  connectedAt: z.string().nullable(),
});

export const schemaTelegramLinkCode = z.object({
  code: z.string().min(1),
  expiresAt: z.string(),
  deepLink: z.string().url(),
});

export const schemaHabit = z.object({
  id: z.number(),
  title: z.string(),
  archived: z.boolean(),
  checkedToday: z.boolean(),
  checkDates: z.array(z.string()),
  currentStreak: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const schemaAchievement = z.object({
  id: z.number().nullable(),
  key: z.string(),
  title: z.string(),
  description: z.string(),
  encouragement: z.string(),
  icon: z.string(),
  earned: z.boolean(),
  earnedAt: z.string().nullable(),
  current: z.number().int().nonnegative(),
  target: z.number().int().positive(),
});

export const schemaRhythmCalendar = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  from: z.string(),
  to: z.string(),
  canGoPrevious: z.boolean(),
  canGoNext: z.boolean(),
  days: z.array(z.object({
    date: z.string(),
    inMonth: z.boolean(),
    state: z.enum(["active", "rescued", "missed", "today", "future", "empty"]),
  })).min(35).max(42),
});

export const schemaProgressOverview = z.object({
  xp: z.object({
    current: z.number().int().nonnegative(),
    level: z.number().int().positive(),
    nextLevelAt: z.number().int().nonnegative(),
  }),
  taskStreak: z.object({
    current: z.number().int().nonnegative(),
    longest: z.number().int().nonnegative(),
    lastActiveOn: z.string().nullable(),
    days: z.array(z.string()),
    missedDateEligibleForRescue: z.string().nullable(),
    calendar: schemaRhythmCalendar.optional(),
  }),
  rescues: z.object({
    remaining: z.number().int().nonnegative(),
    monthlyLimit: z.number().int().positive(),
    usedDates: z.array(z.string()),
  }),
  habits: z.array(schemaHabit),
  achievements: z.array(schemaAchievement),
  canUseFocusFeatures: z.boolean(),
});

export const schemaAnalyticsSnapshot = z.object({
  period: z.object({
    kind: z.enum(["week", "month"]),
    from: z.string(),
    to: z.string(),
  }),
  completedTasks: z.number().int().nonnegative(),
  dailyCompleted: z.array(
    z.object({
      date: z.string(),
      completedTasks: z.number().int().nonnegative(),
    })
  ),
  energyDistribution: z.object({
    low: z.number().int().nonnegative(),
    med: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
  }),
  taskStreak: z.number().int().nonnegative(),
  time: z.object({
    estimatedMinutes: z.number().int().nonnegative(),
    actualMinutes: z.number().int().nonnegative(),
    tasksWithEstimate: z.number().int().nonnegative(),
    tasksWithActual: z.number().int().nonnegative(),
  }),
  hasActivity: z.boolean(),
  canUseFocusFeatures: z.boolean(),
  focusBetaAvailable: z.boolean(),
  focusBetaEnabled: z.boolean(),
  canRequestAiInsight: z.boolean(),
});

export const schemaAnalyticsInsight = z.object({
  insight: z.string().min(1),
  cost: z.number().int().positive(),
  usage: z.object({
    limit: z.number().int().positive(),
    remaining: z.number().int().nonnegative(),
    resetAt: z.string(),
  }),
});

export const schemaNoteTaskLink = z.object({
  id: z.number(),
  task: z.object({
    id: z.number(),
    title: z.string(),
    completed: z.boolean(),
  }),
});

export const schemaNote = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  archived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  taskLinks: z.array(schemaNoteTaskLink).default([]),
});

export type LoginData = z.infer<typeof schemaLoginData>;
export type Task = z.infer<typeof schemaTask>;
export type TaskDraft = z.infer<typeof schemaTaskDraft>;
export type Auth = z.infer<typeof schemaAuthData>;
export type SubTask = z.infer<typeof schemaSubTask>;
export type SubTaskDraft = z.infer<typeof schemaSubTaskDraft>;
export type UserProgress = z.infer<typeof schemaUserProgress>;
export type TaskCompletionOutcome = z.infer<typeof schemaTaskCompletionOutcome>;
export type TaskUpdateResponse = z.infer<typeof schemaTaskUpdateResponse>;
export type AvatarId = z.infer<typeof schemaAvatarId>;
export type AiTone = z.infer<typeof schemaAiTone>;
export type UserPreferences = z.infer<typeof schemaUserPreferences>;
export type UserPreferencesPatch = z.infer<typeof schemaUserPreferencesPatch>;
export type TelegramConnectionStatus = z.infer<typeof schemaTelegramConnectionStatus>;
export type TelegramLinkCode = z.infer<typeof schemaTelegramLinkCode>;
export type Habit = z.infer<typeof schemaHabit>;
export type Achievement = z.infer<typeof schemaAchievement>;
export type ProgressOverview = z.infer<typeof schemaProgressOverview>;
export type AnalyticsSnapshot = z.infer<typeof schemaAnalyticsSnapshot>;
export type AnalyticsInsight = z.infer<typeof schemaAnalyticsInsight>;
export type Note = z.infer<typeof schemaNote>;
export type NoteTaskLink = z.infer<typeof schemaNoteTaskLink>;

export type TaskDateGroup<T> = {
  key: string;
  label: string;
  date: Date | null;
  tasks: T[];
  isUndated: boolean;
};
