import { z } from "zod";

export const schemaTask = z.object({
  id: z.number(),
  title: z.string().min(1),
  date: z.string(),
  priority: z.enum(["🔥 P1", "⚡️ P2", "💤 P3"]),
  category: z.string().min(1),
  completed: z.boolean(),
  energyLevel: z.enum(["low", "med", "high"]),
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
export type LoginData = z.infer<typeof schemaLoginData>;

export type Task = z.infer<typeof schemaTask>;
export type Auth = z.infer<typeof schemaAuthData>;

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
