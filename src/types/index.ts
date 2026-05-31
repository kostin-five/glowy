import { z } from "zod";

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

export const schemaSubTask = z.object({
  id: z.number(),
  taskId: z.number(),
  title: z.string().min(1),
  completed: z.boolean(),
  position: z.number().default(0),
});

export const schemaSubTaskDraft = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false),
  position: z.number().default(0),
});

export const schemaTask = z.object({
  id: z.number(),
  title: z.string().min(1),
  date: z.string(),
  priority: z.enum(["🔥 P1", "⚡️ P2", "💤 P3"]),
  category: z.string(),
  completed: z.boolean(),
  xpAwarded: z.boolean().default(false),
  energyLevel: z.enum(["low", "med", "high"]),
  subtasks: z.array(schemaSubTask).default([]),
});

export const schemaTaskDraft = schemaTask
  .omit({ id: true, completed: true, subtasks: true, xpAwarded: true })
  .extend({
    id: z.number().optional(),
    completed: z.boolean().default(false),
    subtasks: z.array(schemaSubTaskDraft).default([]),
  });

export const schemaAuthData = z.object({
  name: z.string(),
  login: z.string(),
  password: z.string(),
});

export const schemaLoginData = z.object({
  login: z.string(),
  password: z.string(),
});

export const schemaUserProgress = z.object({
  xp: z.number(),
  level: z.number(),
});

export type LoginData = z.infer<typeof schemaLoginData>;
export type Task = z.infer<typeof schemaTask>;
export type TaskDraft = z.infer<typeof schemaTaskDraft>;
export type Auth = z.infer<typeof schemaAuthData>;
export type SubTask = z.infer<typeof schemaSubTask>;
export type SubTaskDraft = z.infer<typeof schemaSubTaskDraft>;
export type UserProgress = z.infer<typeof schemaUserProgress>;
