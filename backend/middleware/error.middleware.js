import { logger } from "../lib/logger.js";

export const buildErrorEnvelope = (req, error, code, extra = {}) => ({
  error,
  code,
  ...(req?.requestId ? { requestId: req.requestId } : {}),
  ...extra,
});

export const errorMiddleware = (error, req, res, next) => {
  logger.error("request.unhandled", {
    req,
    error,
    statusCode: 500,
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json(
    buildErrorEnvelope(
      req,
      "Внутренняя ошибка сервера. Попробуйте ещё раз позже.",
      "INTERNAL_SERVER_ERROR"
    )
  );
};
