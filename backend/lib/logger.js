const SAFE_STRING_PATTERN = /^[A-Za-z0-9А-Яа-яЁё_.:/-]{1,240}$/;
const SAFE_CODE_PATTERN = /^[A-Z0-9_]{1,60}$/;
const SAFE_EVENT_PATTERN = /^[a-z0-9_.-]{1,120}$/;
const CONTAINER_FIELDS = new Set(["metrics"]);
const NUMBER_FIELDS = new Set([
  "completionTokens",
  "cost",
  "durationMs",
  "limit",
  "port",
  "promptTokens",
  "remaining",
  "statusCode",
  "totalTokens",
]);
const BOOLEAN_FIELDS = new Set(["retryable"]);
const CODE_FIELDS = new Set(["code", "errorCode", "providerCode"]);
const STRING_FIELDS = new Set([
  "errorName",
  "method",
  "model",
  "operation",
  "path",
  "plan",
  "provider",
  "requestId",
  "route",
  "status",
]);

const sanitizeValue = (key, value) => {
  if (CONTAINER_FIELDS.has(key)) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? sanitizeLogContext(value)
      : undefined;
  }
  if (NUMBER_FIELDS.has(key)) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : undefined;
  }
  if (BOOLEAN_FIELDS.has(key)) {
    return typeof value === "boolean" ? value : undefined;
  }
  if (CODE_FIELDS.has(key)) {
    return typeof value === "string" && SAFE_CODE_PATTERN.test(value)
      ? value
      : undefined;
  }
  if (STRING_FIELDS.has(key)) {
    return typeof value === "string" && SAFE_STRING_PATTERN.test(value)
      ? value
      : undefined;
  }
  return undefined;
};

export const sanitizeLogContext = (context = {}) =>
  Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) => {
      const safeValue = sanitizeValue(key, value);
      if (safeValue === undefined) return [];
      if (
        CONTAINER_FIELDS.has(key) &&
        Object.keys(safeValue).length === 0
      ) {
        return [];
      }
      return [[key, safeValue]];
    })
  );

const getRequestContext = (req) => ({
  requestId: req?.requestId,
  method: req?.method,
  path: req?.path,
});

const writeLog = (level, event, context = {}) => {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event: SAFE_EVENT_PATTERN.test(event) ? event : "log.invalid_event",
    ...sanitizeLogContext(context),
  };

  const output = JSON.stringify(record);
  if (level === "error") {
    console.error(output);
    return;
  }

  console.log(output);
};

export const logger = {
  info(event, context) {
    writeLog("info", event, context);
  },

  error(event, { req, error, statusCode, errorCode } = {}) {
    writeLog("error", event, {
      ...getRequestContext(req),
      statusCode,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode,
    });
  },
};
