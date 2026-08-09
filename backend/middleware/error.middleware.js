import { logger } from "../lib/logger.js";

export const errorMiddleware = (error, req, res, next) => {
  logger.error("request.unhandled", {
    req,
    error,
    statusCode: 500,
  });

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: "Внутренняя ошибка сервера. Попробуйте ещё раз позже.",
  });
};
