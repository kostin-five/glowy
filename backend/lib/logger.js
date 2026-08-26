const getRequestContext = (req) => ({
  requestId: req?.requestId,
  method: req?.method,
  path: req?.path,
});

const writeLog = (level, event, context = {}) => {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
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
      ...(typeof errorCode === "string" && /^[A-Z0-9_]{1,60}$/.test(errorCode)
        ? { errorCode }
        : {}),
    });
  },
};
