import { z } from "zod";

export const schemaTask = z.object({
  id: z.number(),
  title: z.string().min(1),
  date: z.string(),
  priority: z.enum(["Важно", "Нормально", "Не срочно"]),
  category: z.string().min(1),
  completed: z.boolean(),
  energyLevel: z.enum(["low", "med", "high"]),
});

export const schemaAuthData = z.object({
  username: z.string(),
  password: z.string(),
});

export type Task = z.infer<typeof schemaTask>;
export type Auth = z.infer<typeof schemaAuthData>;
