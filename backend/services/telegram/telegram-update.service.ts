import { prisma } from "../../lib/prisma.js";
import type { Prisma, PrismaClient } from "@prisma/client";
import { isUnknownRecord } from "../../types/boundaries.js";

const MAX_ATTEMPTS = 3;
const PAYLOAD_TTL_MS = 30 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export interface TelegramMessage extends Record<string, unknown> {
  text?: unknown;
  voice?: unknown;
}

export interface TelegramCallback extends Record<string, unknown> {
  id?: unknown;
  data?: unknown;
  message?: (Record<string, unknown> & { message_id?: unknown }) | null;
}

export interface TelegramActor {
  telegramUserId: string;
  chatId: string;
  privateChat: boolean;
  message: TelegramMessage | null;
  callback: TelegramCallback | null;
}

const EMPTY_PAYLOAD = null as unknown as Prisma.InputJsonValue;

export const getTelegramActor = (update: unknown): TelegramActor | null => {
  const record = isUnknownRecord(update) ? update : null;
  const message = record && isUnknownRecord(record.message) ? record.message : null;
  const callback =
    record && isUnknownRecord(record.callback_query)
      ? record.callback_query
      : null;
  const callbackMessage =
    callback && isUnknownRecord(callback.message) ? callback.message : null;
  const actor = message && isUnknownRecord(message.from)
    ? message.from
    : callback && isUnknownRecord(callback.from)
      ? callback.from
      : null;
  const chat = message && isUnknownRecord(message.chat)
    ? message.chat
    : callbackMessage && isUnknownRecord(callbackMessage.chat)
      ? callbackMessage.chat
      : null;

  if (!actor?.id || !chat?.id) return null;
  return {
    telegramUserId: String(actor.id),
    chatId: String(chat.id),
    privateChat: chat.type === "private",
    message: message as TelegramMessage | null,
    callback: callback as TelegramCallback | null,
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

export const createTelegramUpdateService = ({
  db = prisma,
  now = () => new Date(),
}: { db?: PrismaClient; now?: () => Date } = {}) => ({
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

  complete(updateId: string) {
    return db.telegramWebhookUpdate.update({
      where: { updateId },
      data: {
        status: "PROCESSED",
        payload: EMPTY_PAYLOAD,
        processedAt: now(),
        lastErrorCode: null,
      },
    });
  },

  fail(
    update: { updateId: string; attempts: number },
    errorCode: string,
    retryable: boolean
  ) {
    const terminal = !retryable || update.attempts >= MAX_ATTEMPTS;
    const retryDelayMs = Math.min(30_000, 1_000 * 2 ** Math.max(0, update.attempts - 1));
    const data: Prisma.TelegramWebhookUpdateUpdateInput = terminal
      ? {
          status: "FAILED",
          payload: EMPTY_PAYLOAD,
          processedAt: now(),
          lastErrorCode: errorCode,
        }
      : {
          status: "PENDING",
          availableAt: new Date(now().getTime() + retryDelayMs),
          lastErrorCode: errorCode,
        };
    return db.telegramWebhookUpdate.update({
      where: { updateId: update.updateId },
      data,
    });
  },

  async cleanup() {
    const current = now();
    await db.telegramWebhookUpdate.updateMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        createdAt: { lt: new Date(current.getTime() - PAYLOAD_TTL_MS) },
      },
      data: {
        status: "FAILED",
        payload: EMPTY_PAYLOAD,
        lastErrorCode: "PAYLOAD_EXPIRED",
      },
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
