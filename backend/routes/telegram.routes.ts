import crypto from "node:crypto";
import express from "express";
import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import {
  createAuthToken,
  setAuthCookie,
} from "../services/auth/auth-session.service.js";
import {
  createTelegramMiniAppSessionService,
  isTelegramMiniAppSessionError,
} from "../services/telegram/telegram-mini-app-session.service.js";
import { isUnknownRecord } from "../types/boundaries.js";
import { requireRegistrationEnabled } from "../middleware/error.middleware.js";

const safeSecretEqual = (received: unknown, expected: unknown): boolean => {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const normalizeUpdateId = (value: unknown): string | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : null;

export const createTelegramRouter = ({
  db = prisma,
  webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET,
  notifyWorker = () => {},
  miniAppSessions = createTelegramMiniAppSessionService({ db }),
} = {}) => {
  const router = express.Router();

  const miniAppLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip || ""),
    message: { error: "Слишком много попыток. Попробуйте позже." },
  });

  const sendMiniAppSession = (
    res: Response,
    result: { connectionId: number; user: { id: number } & Record<string, unknown> },
    status = 200
  ) => {
    const token = createAuthToken(result.user.id, {
      telegramConnectionId: result.connectionId,
      expiresIn: "24h",
    });
    setAuthCookie(res, token, { telegram: true });
    return res.status(status).json(result.user);
  };

  const handleMiniAppError = (
    req: Request,
    res: Response,
    error: unknown,
    event: string
  ) => {
    const status = isTelegramMiniAppSessionError(error) ? error.status : 500;
    logger.error(event, {
      req,
      error,
      statusCode: status,
      errorCode: isTelegramMiniAppSessionError(error) ? error.code : undefined,
    });
    return res.status(status).json({
      code: isTelegramMiniAppSessionError(error) ? error.code : "TELEGRAM_SESSION_FAILED",
      error: isTelegramMiniAppSessionError(error)
        ? error.message
        : "Не удалось открыть Glowy в Telegram",
    });
  };

  router.post("/mini-app/session", miniAppLimiter, async (req, res) => {
    const startedAt = Date.now();
    try {
      const result = await miniAppSessions.restore(req.body?.initData);
      res.setHeader("Server-Timing", `telegram-session;dur=${Date.now() - startedAt}`);
      return sendMiniAppSession(res, result);
    } catch (error) {
      return handleMiniAppError(req, res, error, "telegram.mini_app.session_failed");
    }
  });

  router.post("/mini-app/register", requireRegistrationEnabled, miniAppLimiter, async (req, res) => {
    try {
      const result = await miniAppSessions.register({
        initData: req.body?.initData,
        name: req.body?.name,
        email: req.body?.email,
        password: req.body?.password,
      });
      return sendMiniAppSession(res, result, 201);
    } catch (error) {
      return handleMiniAppError(req, res, error, "telegram.mini_app.register_failed");
    }
  });

  router.post("/mini-app/login", miniAppLimiter, async (req, res) => {
    try {
      const result = await miniAppSessions.login({
        initData: req.body?.initData,
        email: req.body?.email,
        password: req.body?.password,
      });
      return sendMiniAppSession(res, result);
    } catch (error) {
      return handleMiniAppError(req, res, error, "telegram.mini_app.login_failed");
    }
  });

  router.post("/webhook", async (req, res) => {
    const receivedSecret = req.get("X-Telegram-Bot-Api-Secret-Token");
    if (!webhookSecret || !safeSecretEqual(receivedSecret, webhookSecret)) {
      return res.status(401).json({ ok: false });
    }

    const rawBody: unknown = req.body;
    const body = isUnknownRecord(rawBody) ? rawBody : null;
    const updateId = normalizeUpdateId(body?.update_id);
    const hasSupportedPayload = Boolean(body?.message || body?.callback_query);
    if (!updateId || !hasSupportedPayload) {
      return res.status(400).json({ ok: false });
    }

    try {
      await db.telegramWebhookUpdate.upsert({
        where: { updateId },
        create: {
          updateId,
          payload: body as unknown as Prisma.InputJsonObject,
          status: "PENDING",
          availableAt: new Date(),
        },
        update: {},
      });
      notifyWorker();
      return res.json({ ok: true });
    } catch (error) {
      logger.error("telegram.webhook.queue_failed", {
        req,
        error,
        statusCode: 503,
      });
      return res.status(503).json({ ok: false });
    }
  });

  return router;
};

export default createTelegramRouter();
