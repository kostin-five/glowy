import { prisma } from "../../lib/prisma.js";

const MAX_ATTEMPTS = 3;
const PAYLOAD_TTL_MS = 30 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export const getTelegramActor = (update) => {
  const message = update?.message;
  const callback = update?.callback_query;
  const actor = message?.from || callback?.from;
  const chat = message?.chat || callback?.message?.chat;

  if (!actor?.id || !chat?.id) return null;
  return {
    telegramUserId: String(actor.id),
    chatId: String(chat.id),
    privateChat: chat.type === "private",
    message,
    callback,
  };
};

export const getDateOnlyInTimeZone = (
  now = new Date(),
  timeZone = "Europe/Moscow"
) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const createTelegramUpdateService = ({ db = prisma, now = () => new Date() } = {}) => ({
  async claimNext() {
    const current = now();
    const staleBefore = new Date(current.getTime() - STALE_PROCESSING_MS);
    return db.$transaction(async (tx) => {
      const candidate = await tx.telegramWebhookUpdate.findFirst({
        where: {
          OR: [
            { status: "PENDING", availableAt: { lte: current } },
            { status: "PROCESSING", updatedAt: { lte: staleBefore } },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { updateId: "asc" }],
      });
      if (!candidate) return null;

      const claimed = await tx.telegramWebhookUpdate.updateMany({
        where: {
          updateId: candidate.updateId,
          status: candidate.status,
          updatedAt: candidate.updatedAt,
        },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          lastErrorCode: null,
        },
      });
      if (claimed.count !== 1) return null;
      return { ...candidate, status: "PROCESSING", attempts: candidate.attempts + 1 };
    });
  },

  complete(updateId) {
    return db.telegramWebhookUpdate.update({
      where: { updateId },
      data: {
        status: "PROCESSED",
        payload: null,
        processedAt: now(),
        lastErrorCode: null,
      },
    });
  },

  fail(update, errorCode, retryable) {
    const terminal = !retryable || update.attempts >= MAX_ATTEMPTS;
    const retryDelayMs = Math.min(30_000, 1_000 * 2 ** Math.max(0, update.attempts - 1));
    return db.telegramWebhookUpdate.update({
      where: { updateId: update.updateId },
      data: terminal
        ? {
            status: "FAILED",
            payload: null,
            processedAt: now(),
            lastErrorCode: errorCode,
          }
        : {
            status: "PENDING",
            availableAt: new Date(now().getTime() + retryDelayMs),
            lastErrorCode: errorCode,
          },
    });
  },

  async cleanup() {
    const current = now();
    await db.telegramWebhookUpdate.updateMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        createdAt: { lt: new Date(current.getTime() - PAYLOAD_TTL_MS) },
      },
      data: { status: "FAILED", payload: null, lastErrorCode: "PAYLOAD_EXPIRED" },
    });
    await db.telegramTaskDraft.updateMany({
      where: { status: "PENDING", expiresAt: { lte: current } },
      data: { status: "EXPIRED" },
    });
    await db.telegramWebhookUpdate.deleteMany({
      where: {
        status: { in: ["PROCESSED", "FAILED"] },
        createdAt: { lt: new Date(current.getTime() - IDEMPOTENCY_TTL_MS) },
      },
    });
  },
});

export default createTelegramUpdateService;
