import crypto from "node:crypto";
import express from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const safeSecretEqual = (received, expected) => {
  if (typeof received !== "string" || typeof expected !== "string") return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
};

const normalizeUpdateId = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? String(value) : null;

export const createTelegramRouter = ({
  db = prisma,
  webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET,
  notifyWorker = () => {},
} = {}) => {
  const router = express.Router();

  router.post("/webhook", async (req, res) => {
    const receivedSecret = req.get("X-Telegram-Bot-Api-Secret-Token");
    if (!webhookSecret || !safeSecretEqual(receivedSecret, webhookSecret)) {
      return res.status(401).json({ ok: false });
    }

    const updateId = normalizeUpdateId(req.body?.update_id);
    const hasSupportedPayload = Boolean(req.body?.message || req.body?.callback_query);
    if (!updateId || !hasSupportedPayload) {
      return res.status(400).json({ ok: false });
    }

    try {
      await db.telegramWebhookUpdate.upsert({
        where: { updateId },
        create: {
          updateId,
          payload: req.body,
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
