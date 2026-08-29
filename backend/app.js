import "dotenv/config";
import cors from "cors";
import express from "express";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/auth.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import subTaskRoutes from "./routes/subtask.routes.js";
import userEnergyRoutes from "./routes/user.routes.js";
import chatRouter from "./routes/chat.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import notesRoutes from "./routes/notes.routes.js";
import telegramRoutes from "./routes/telegram.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";

const prodOrigins = ["https://glowy-ai.ru", "https://www.glowy-ai.ru"];
const devOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
];

const addLocalhostAliases = (origins) => {
  const aliases = origins.flatMap((origin) => {
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost") {
        url.hostname = "127.0.0.1";
        return [origin, url.origin];
      }
      if (url.hostname === "127.0.0.1") {
        url.hostname = "localhost";
        return [origin, url.origin];
      }
    } catch {
      return [origin];
    }
    return [origin];
  });

  return [...new Set(aliases)];
};

const getAllowedOrigins = (isProd) => {
  const configuredOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : isProd
      ? prodOrigins
      : [...prodOrigins, ...devOrigins];

  return isProd
    ? configuredOrigins
    : addLocalhostAliases(configuredOrigins);
};

export const createApp = ({ testRoute = false, telegramRouter = telegramRoutes } = {}) => {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigins = getAllowedOrigins(isProd);

  const csrfProtection = (req, res, next) => {
    const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (!unsafeMethods.includes(req.method)) return next();

    const headerValue = req.headers.origin || req.headers.referer;
    if (!headerValue) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    try {
      const origin = new URL(headerValue).origin;
      if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
    } catch {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    return next();
  };

  app.set("trust proxy", 1);
  app.disable("etag");
  app.use(requestIdMiddleware);
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return next();
  });
  app.use(express.json());
  app.use(
    cors({
      origin(origin, callback) {
        return callback(null, !origin || allowedOrigins.includes(origin));
      },
      credentials: true,
    })
  );

  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return next();
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }
    return next();
  });

  app.use((req, res, next) => {
    if (
      req.method === "POST" &&
      ["/api/payments/yookassa/webhook", "/api/telegram/webhook"].includes(req.path)
    ) {
      return next();
    }
    return csrfProtection(req, res, next);
  });

  app.use((req, res, next) => {
    const host = req.get("host");
    if (host && host.includes("dev.glowy-ai.ru")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    return next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "glowy-backend" });
  });

  if (testRoute) {
    app.get("/api/__test__/error", () => {
      throw new Error("Intentional test error");
    });
  }

  app.use("/api/tasks", taskRoutes);
  app.use("/api/auth", userRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/subtasks", subTaskRoutes);
  app.use("/api/user", userEnergyRoutes);
  app.use("/api/chat", chatRouter);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/notes", notesRoutes);
  app.use("/api/telegram", telegramRouter);
  app.use(errorMiddleware);

  return app;
};

export default createApp();
