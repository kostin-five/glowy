import { z } from "zod";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value: string) => {
  if (!DATE_ONLY_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const positiveIdSchema = z.number().int().positive().safe();
export const positiveIdParamSchema = z.coerce.number().int().positive().safe();
export const dateOnlySchema = z.string().refine(isValidDateOnly, {
  message: "Используйте дату в формате YYYY-MM-DD",
});
export const optionalTaskDateSchema = z.union([dateOnlySchema, z.literal("")]);
export const monthOnlySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const prioritySchema = z.enum(["🔥 P1", "⚡️ P2", "💤 P3"]);
export const energyLevelSchema = z.enum(["low", "med", "high"]);
export const optionalMinutesSchema = z
  .number()
  .int()
  .min(1)
  .max(1440)
  .nullable();

export type Priority = z.infer<typeof prioritySchema>;
export type EnergyLevel = z.infer<typeof energyLevelSchema>;
