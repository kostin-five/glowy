import { generateContentWithAiProvider } from "./ai-provider.service.js";
import { parseJsonLoose } from "./mind-hub-parser.service.js";

const priorities = new Set(["🔥 P1", "⚡️ P2", "💤 P3"]);
const energyLevels = new Set(["low", "med", "high"]);

export const normalizeNoteTaskDraft = (value) => {
  const title = typeof value?.title === "string" ? value.title.trim() : "";
  if (!title) throw new Error("AI provider returned an empty note task draft");

  return {
    title: title.slice(0, 255),
    date: typeof value?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
      ? value.date
      : "",
    priority: priorities.has(value?.priority) ? value.priority : "⚡️ P2",
    energyLevel: energyLevels.has(value?.energyLevel) ? value.energyLevel : "med",
    category:
      typeof value?.category === "string" && value.category.trim()
        ? value.category.trim().slice(0, 100)
        : "Личное",
  };
};

export const generateNoteTaskDraft = async (fragment, accountingContext) => {
  const prompt = `Ты — Glowy, спокойный помощник по планированию. Преврати фрагмент заметки в один реалистичный следующий шаг. Верни только JSON без Markdown: {"title":"...","date":"","priority":"⚡️ P2","energyLevel":"med","category":"Личное"}. Не добавляй факты, которых нет во фрагменте. Заголовок должен начинаться с глагола и быть не длиннее 255 символов. Фрагмент заметки:\n${fragment}`;
  const { text } = await generateContentWithAiProvider(
    prompt,
    "Note task draft",
    accountingContext
  );
  return normalizeNoteTaskDraft(parseJsonLoose(text));
};
