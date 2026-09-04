import type { SubtaskDraftRequest } from "@glowy/contracts";
import { subtaskDraftResponseSchema } from "@glowy/contracts";
import { isUnknownRecord } from "../../types/boundaries.js";
import { generateContentWithAiProvider } from "./ai-provider.service.js";
import { parseJsonLoose } from "./mind-hub-parser.service.js";

interface AccountingContext {
  userId?: number | null;
}

export class InvalidSubtaskDraftError extends Error {
  code = "AI_SUBTASK_DRAFT_INVALID";
}

export const normalizeSubtaskDraft = (
  value: unknown,
  existingSubtasks: string[] = []
) => {
  const record = isUnknownRecord(value) ? value : null;
  const rawItems = Array.isArray(record?.subtasks)
    ? record.subtasks
    : Array.isArray(value)
      ? value
      : [];
  const existing = new Set(existingSubtasks.map((title) => title.trim().toLocaleLowerCase("ru-RU")));
  const seen = new Set(existing);
  const subtasks: Array<{ title: string }> = [];

  for (const item of rawItems) {
    const rawTitle = typeof item === "string"
      ? item
      : isUnknownRecord(item) && typeof item.title === "string"
        ? item.title
        : "";
    const title = rawTitle.trim().replace(/\s+/g, " ").slice(0, 160);
    const key = title.toLocaleLowerCase("ru-RU");
    if (!title || seen.has(key)) continue;
    seen.add(key);
    subtasks.push({ title });
    if (subtasks.length === 8) break;
  }

  const parsed = subtaskDraftResponseSchema.shape.subtasks.safeParse(subtasks);
  if (!parsed.success) {
    throw new InvalidSubtaskDraftError("AI provider returned an invalid subtask draft");
  }
  return parsed.data;
};

export const generateSubtaskDraft = async (
  task: SubtaskDraftRequest,
  accountingContext?: AccountingContext | null
) => {
  const prompt = `Ты — Glowy, спокойный помощник по планированию. Разбей одну задачу на 2–8 коротких, конкретных и последовательных действий. Не повторяй уже существующие шаги, не добавляй факты и не меняй цель задачи. Каждый пункт не длиннее 160 символов и начинается с глагола. Верни только JSON без Markdown: {"subtasks":[{"title":"..."}]}.
Задача: ${task.title}
Категория: ${task.category || "не указана"}
Приоритет: ${task.priority}
Энергия: ${task.energyLevel}
Оценка времени: ${task.estimatedMinutes ?? "не указана"}
Уже есть шаги: ${task.existingSubtasks.length ? task.existingSubtasks.join("; ") : "нет"}`;
  const { text } = await generateContentWithAiProvider(
    prompt,
    "Subtask draft",
    accountingContext
  );
  return normalizeSubtaskDraft(parseJsonLoose(text), task.existingSubtasks);
};
