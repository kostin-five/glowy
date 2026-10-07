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
  const inputError = typeof error === "object" && error !== null && "type" in error
    ? error.type : undefined;
  if (inputError === "entity.parse.failed" || inputError === "entity.too.large") {
    const tooLarge = inputError === "entity.too.large";
    return res.status(tooLarge ? 413 : 400).json(buildErrorEnvelope(req,
      tooLarge ? "Запрос слишком большой." : "Некорректный JSON.",
      tooLarge ? "REQUEST_TOO_LARGE" : "REQUEST_JSON_INVALID"));
  }
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
// Registration requires an explicit opt-in, including the Telegram adapter.
export const requireRegistrationEnabled: import("express").RequestHandler = (req, res, next) => {
  if (process.env.REGISTRATION_ENABLED === "true") return next();
  return res.status(403).json(buildErrorEnvelope(req,
    "Регистрация закрыта. Можно открыть демо без аккаунта или войти в существующий аккаунт.",
    "AUTH_REGISTRATION_DISABLED"));
};
