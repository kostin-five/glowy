import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";

const getRouteTemplate = (req) => {
  const routePath = typeof req.route?.path === "string" ? req.route.path : null;
  if (!routePath) return "unmatched";

  const originalPath = (req.originalUrl || "").split("?", 1)[0];
  const originalSegments = originalPath.split("/").filter(Boolean);
  const routeSegments = routePath.split("/").filter(Boolean);
  const mountSegments = originalSegments.slice(
    0,
    Math.max(0, originalSegments.length - routeSegments.length)
  );
  return `/${[...mountSegments, ...routeSegments].join("/")}`;
};

export const requestIdMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info("request.completed", {
      requestId,
      method: req.method,
      route: getRouteTemplate(req),
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });
  next();
};
