import { generateContentWithAiProvider } from "./ai-provider.service.js";
import { parseJsonLoose } from "./mind-hub-parser.service.js";
import { isUnknownRecord } from "../../types/boundaries.js";

const priorities = new Set<string>(["🔥 P1", "⚡️ P2", "💤 P3"]);
const energyLevels = new Set<string>(["low", "med", "high"]);

export interface TaskDraft {
  title: string;
  date: string;
  priority: string;
  energyLevel: string;
  category: string;
}

interface AccountingContext {
  userId?: number | null;
}

export const normalizeTaskDraftFromText = (value: unknown): TaskDraft => {
  const record = isUnknownRecord(value) ? value : null;
  const title = typeof record?.title === "string" ? record.title.trim() : "";
  if (!title) throw new Error("AI provider returned an empty note task draft");

  return {
    title: title.slice(0, 255),
    date: typeof record?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
      ? record.date
      : "",
    priority: typeof record?.priority === "string" && priorities.has(record.priority)
      ? record.priority
      : "⚡️ P2",
    energyLevel:
      typeof record?.energyLevel === "string" && energyLevels.has(record.energyLevel)
        ? record.energyLevel
        : "med",
    category:
      typeof record?.category === "string" && record.category.trim()
        ? record.category.trim().slice(0, 100)
        : "Личное",
  };
};

export const generateTaskDraftFromText = async (
  sourceText: string,
  accountingContext?: AccountingContext | null,
  sourceLabel = "Task draft"
): Promise<TaskDraft> => {
  const prompt = `Ты — Glowy, спокойный помощник по планированию. Преврати текст пользователя в один реалистичный следующий шаг. Верни только JSON без Markdown: {"title":"...","date":"","priority":"⚡️ P2","energyLevel":"med","category":"Личное"}. Не добавляй факты, которых нет в тексте. Заголовок должен начинаться с глагола и быть не длиннее 255 символов. Текст пользователя:\n${sourceText}`;
  const { text } = await generateContentWithAiProvider(
    prompt,
    sourceLabel,
    accountingContext
  );
  return normalizeTaskDraftFromText(parseJsonLoose(text));
};

export const normalizeNoteTaskDraft = normalizeTaskDraftFromText;
export const generateNoteTaskDraft = (
  fragment: string,
  accountingContext?: AccountingContext | null
) =>
  generateTaskDraftFromText(fragment, accountingContext, "Note task draft");
