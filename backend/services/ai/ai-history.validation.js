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
