import type { ErrorRequestHandler, Request } from "express";
import { logger } from "../lib/logger.js";

export const buildErrorEnvelope = (
  req: Request,
  error: string,
  code: string,
  extra: Record<string, unknown> = {}
) => ({
  error,
  code,
  ...(req?.requestId ? { requestId: req.requestId } : {}),
  ...extra,
});

export const errorMiddleware: ErrorRequestHandler = (error, req, res, next) => {
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
