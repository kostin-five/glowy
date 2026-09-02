import { taskSchema } from "@glowy/contracts";
import { isUnknownRecord } from "../../types/boundaries.js";
import { isDateOnly, normalizeOptionalMinutes } from "../../utils/validation.utils.js";

const priorityAliases: Record<string, "🔥 P1" | "⚡️ P2" | "💤 P3"> = {
  "🔥 P1": "🔥 P1",
  "⚡️ P2": "⚡️ P2",
  "💤 P3": "💤 P3",
  Важно: "🔥 P1",
  Нормально: "⚡️ P2",
  "Не срочно": "💤 P3",
  P1: "🔥 P1",
  P2: "⚡️ P2",
  P3: "💤 P3",
};

const normalizeDateParts = (year: number, month: number, day: number) => {
  const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isDateOnly(candidate) ? candidate : null;
};

export const normalizeLegacyTaskDate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (isDateOnly(trimmed)) return trimmed;

  const match = value
    .trim()
    .match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!match) return null;

  return normalizeDateParts(Number(match[3]), Number(match[2]), Number(match[1]));
};

export const getLegacyCompletionDate = (
  completedOn: unknown,
  updatedAt: unknown
): string | null => {
  const explicitDate = normalizeLegacyTaskDate(completedOn);
  if (explicitDate) return explicitDate;

  const updated =
    updatedAt instanceof Date
      ? updatedAt
      : typeof updatedAt === "string"
        ? new Date(updatedAt)
        : null;

  return updated && !Number.isNaN(updated.getTime())
    ? updated.toISOString().slice(0, 10)
    : null;
};

const normalizeSubtask = (value: unknown, index: number) => {
  if (!isUnknownRecord(value)) return value;
  const title = typeof value.title === "string" ? value.title.trim() : "";

  return {
    ...value,
    title: title.slice(0, 255) || "Без названия",
    position:
      typeof value.position === "number" &&
      Number.isInteger(value.position) &&
      value.position >= 0
        ? value.position
        : index,
  };
};

export const serializeTaskContract = (value: unknown) => {
  if (!isUnknownRecord(value)) return taskSchema.parse(value);

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const category =
    typeof value.category === "string" ? value.category.trim() : "";
  const priority =
    typeof value.priority === "string"
      ? priorityAliases[value.priority.trim()] ?? "⚡️ P2"
      : "⚡️ P2";
  const energyLevel = ["low", "med", "high"].includes(
    String(value.energyLevel)
  )
    ? value.energyLevel
    : "med";
  const estimatedMinutes = normalizeOptionalMinutes(value.estimatedMinutes).value;
  const actualMinutes = normalizeOptionalMinutes(value.actualMinutes).value;

  return taskSchema.parse({
    ...value,
    title: title.slice(0, 255) || "Без названия",
    date: normalizeLegacyTaskDate(value.date) ?? "",
    priority,
    category: category.slice(0, 100),
    completedOn:
      value.completed === true
        ? getLegacyCompletionDate(value.completedOn, value.updatedAt)
        : normalizeLegacyTaskDate(value.completedOn),
    energyLevel,
    estimatedMinutes: estimatedMinutes ?? null,
    actualMinutes: actualMinutes ?? null,
    subtasks: Array.isArray(value.subtasks)
      ? value.subtasks.map(normalizeSubtask)
      : [],
  });
};

export const serializeTaskListContract = (values: unknown[]) =>
  values.map(serializeTaskContract);
