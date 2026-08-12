const PRIORITIES = new Set(["🔥 P1", "⚡️ P2", "💤 P3"]);
const ENERGY_LEVELS = new Set(["low", "med", "high"]);
const DATE_PATTERN = /^$|^\d{4}-\d{2}-\d{2}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

export class AiHistoryValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AiHistoryValidationError";
  }
}

const requireText = (value, label, maxLength) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new AiHistoryValidationError(`${label} не может быть пустым`);
  if (text.length > maxLength) throw new AiHistoryValidationError(`${label} слишком длинное`);
  return text;
};

export const normalizeClientRequestId = (value) => {
  const id = requireText(value, "Идентификатор запроса", 100);
  if (id.length < 8 || !REQUEST_ID_PATTERN.test(id)) {
    throw new AiHistoryValidationError("Некорректный идентификатор запроса");
  }
  return id;
};

export const normalizeMindHubMessage = (value) => requireText(value, "Сообщение", 4000);

export const normalizeHistoryQuery = ({ cursor, limit } = {}) => {
  const parsedCursor = cursor === undefined ? null : Number(cursor);
  const parsedLimit = limit === undefined ? 20 : Number(limit);
  if (parsedCursor !== null && (!Number.isInteger(parsedCursor) || parsedCursor <= 0)) {
    throw new AiHistoryValidationError("Некорректный курсор истории");
  }
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    throw new AiHistoryValidationError("Лимит истории должен быть от 1 до 50");
  }
  return { cursor: parsedCursor, limit: parsedLimit };
};

export const normalizeDraftPayload = (value, { requireVersion = false } = {}) => {
  const source = value && typeof value === "object" ? value : {};
  const version = Number(source.version);
  if (requireVersion && (!Number.isInteger(version) || version < 1)) {
    throw new AiHistoryValidationError("Некорректная версия черновика");
  }
  const title = requireText(source.title, "Название задачи", 255);
  const category = requireText(source.category || "Быт", "Категория", 100);
  const date = typeof source.date === "string" ? source.date.trim() : "";
  if (!DATE_PATTERN.test(date)) throw new AiHistoryValidationError("Дата должна быть в формате YYYY-MM-DD");
  if (!PRIORITIES.has(source.priority)) throw new AiHistoryValidationError("Некорректный приоритет");
  if (!ENERGY_LEVELS.has(source.energyLevel)) throw new AiHistoryValidationError("Некорректная энергозатратность");

  const rawSubtasks = Array.isArray(source.subtasks) ? source.subtasks : [];
  if (rawSubtasks.length > 10) throw new AiHistoryValidationError("В черновике может быть не больше 10 подзадач");
  const seen = new Set();
  const subtasks = rawSubtasks.map((item, position) => {
    const subtaskTitle = requireText(item?.title, "Название подзадачи", 255);
    const key = subtaskTitle.toLocaleLowerCase("ru");
    if (seen.has(key)) throw new AiHistoryValidationError("Подзадачи не должны повторяться");
    seen.add(key);
    return { title: subtaskTitle, completed: false, position };
  });

  return { ...(requireVersion ? { version } : {}), title, date, priority: source.priority, energyLevel: source.energyLevel, category, subtasks };
};
