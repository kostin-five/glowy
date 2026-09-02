import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import type { PrismaClient } from "@prisma/client";
import { getErrorCode } from "../../types/boundaries.js";

const LINK_TTL_MS = 10 * 60 * 1000;
const CODE_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export class TelegramLinkError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "TelegramLinkError";
    this.code = code;
    this.status = status;
  }
}

const createCodeHash = (code: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(code).digest("hex");

export const createTelegramLinkService = ({
  db = prisma,
  linkSecret = process.env.TELEGRAM_LINK_CODE_SECRET,
  botUsername = process.env.TELEGRAM_BOT_USERNAME,
  now = () => new Date(),
  randomBytes = crypto.randomBytes,
}: {
  db?: PrismaClient;
  linkSecret?: string;
  botUsername?: string;
  now?: () => Date;
  randomBytes?: typeof crypto.randomBytes;
} = {}) => {
  const configured = Boolean(linkSecret && botUsername);

  const requireConfigured = () => {
    if (!configured) {
      throw new TelegramLinkError(
        "TELEGRAM_NOT_CONFIGURED",
        "Telegram пока не настроен",
        503
      );
    }
  };

  const unlinkUser = async (userId: number) => {
    await db.$transaction(async (tx) => {
      await tx.telegramConnection.deleteMany({ where: { userId } });
      await tx.telegramLinkCode.deleteMany({ where: { userId } });
    });
    return { ok: true };
  };

  return {
    configured,

    async getStatus(userId: number) {
      const connection = await db.telegramConnection.findUnique({
        where: { userId },
        select: { connectedAt: true },
      });
      return {
        available: configured,
        botUsername: configured ? botUsername : null,
        connected: Boolean(connection),
        connectedAt: connection?.connectedAt || null,
      };
    },

    async createCode(userId: number) {
      requireConfigured();
      const connection = await db.telegramConnection.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (connection) {
        throw new TelegramLinkError(
          "TELEGRAM_ALREADY_CONNECTED",
          "Telegram уже подключён",
          409
        );
      }

      const code = randomBytes(9).toString("base64url");
      const codeHash = createCodeHash(code, linkSecret!);
      const expiresAt = new Date(now().getTime() + LINK_TTL_MS);
      await db.$transaction(async (tx) => {
        await tx.telegramLinkCode.deleteMany({ where: { userId, usedAt: null } });
        await tx.telegramLinkCode.create({
          data: { userId, codeHash, expiresAt },
        });
      });

      return {
        code,
        expiresAt,
        deepLink: `https://t.me/${botUsername!}?start=${code}`,
      };
    },

    async consumeCode({
      code,
      telegramUserId,
      chatId,
    }: {
      code: string;
      telegramUserId: string;
      chatId: string;
    }) {
      requireConfigured();
      if (!CODE_PATTERN.test(code || "")) {
        throw new TelegramLinkError(
          "TELEGRAM_LINK_INVALID",
          "Код привязки недействителен или истёк"
        );
      }

      const current = now();
      const codeHash = createCodeHash(code, linkSecret!);
      try {
        return await db.$transaction(async (tx) => {
          const linkCode = await tx.telegramLinkCode.findUnique({
            where: { codeHash },
            select: { id: true, userId: true, usedAt: true, expiresAt: true },
          });
          if (
            !linkCode ||
            linkCode.usedAt ||
            linkCode.expiresAt.getTime() <= current.getTime()
          ) {
            throw new TelegramLinkError(
              "TELEGRAM_LINK_INVALID",
              "Код привязки недействителен или истёк"
            );
          }

          const [telegramConnection, userConnection] = await Promise.all([
            tx.telegramConnection.findUnique({ where: { telegramUserId } }),
            tx.telegramConnection.findUnique({ where: { userId: linkCode.userId } }),
          ]);
          if (telegramConnection || userConnection) {
            throw new TelegramLinkError(
              "TELEGRAM_LINK_CONFLICT",
              "Сначала отключите текущую привязку Telegram",
              409
            );
          }

          const consumed = await tx.telegramLinkCode.updateMany({
            where: { id: linkCode.id, usedAt: null, expiresAt: { gt: current } },
            data: { usedAt: current },
          });
          if (consumed.count !== 1) {
            throw new TelegramLinkError(
              "TELEGRAM_LINK_INVALID",
              "Код привязки недействителен или истёк"
            );
          }

          const connection = await tx.telegramConnection.create({
            data: { userId: linkCode.userId, telegramUserId, chatId },
          });
          await tx.telegramLinkCode.updateMany({
            where: { userId: linkCode.userId, usedAt: null },
            data: { usedAt: current },
          });
          return connection;
        });
      } catch (error) {
        if (error instanceof TelegramLinkError) throw error;
        if (getErrorCode(error) === "P2002") {
          throw new TelegramLinkError(
            "TELEGRAM_LINK_CONFLICT",
            "Сначала отключите текущую привязку Telegram",
            409
          );
        }
        throw error;
      }
    },

    unlinkUser,

    async unlinkTelegram(telegramUserId: string) {
      const connection = await db.telegramConnection.findUnique({
        where: { telegramUserId },
        select: { userId: true },
      });
      if (!connection) return { ok: true };
      return unlinkUser(connection.userId);
    },
  };
};

export default createTelegramLinkService;
