import { prisma } from "../../lib/prisma.js";
import {
  createUserWithCredentials,
  CredentialsError,
  verifyUserCredentials,
} from "../auth/credentials.service.js";
import { SAFE_USER_SELECT, toSafeUser } from "../auth/auth-session.service.js";
import {
  createTelegramMiniAppAuthService,
  TelegramMiniAppAuthError,
} from "./telegram-mini-app-auth.service.js";

export class TelegramMiniAppSessionError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = "TelegramMiniAppSessionError";
    this.code = code;
    this.status = status;
  }
}

const conflict = () =>
  new TelegramMiniAppSessionError(
    "TELEGRAM_LINK_CONFLICT",
    "Telegram или аккаунт Glowy уже связан с другим профилем"
  );

export const createTelegramMiniAppSessionService = ({
  db = prisma,
  launchAuth = createTelegramMiniAppAuthService(),
} = {}) => {
  const validateLaunch = (initData) => launchAuth.validate(initData);

  const findSession = async (telegramUserId) => {
    const connection = await db.telegramConnection.findUnique({
      where: { telegramUserId },
      select: {
        id: true,
        userId: true,
        user: { select: SAFE_USER_SELECT },
      },
    });
    if (!connection) {
      throw new TelegramMiniAppSessionError(
        "TELEGRAM_REGISTRATION_REQUIRED",
        "Войдите или зарегистрируйтесь внутри Telegram Mini App"
      );
    }
    return { connectionId: connection.id, user: toSafeUser(connection.user) };
  };

  return {
    async restore(initData) {
      const actor = validateLaunch(initData);
      return findSession(actor.telegramUserId);
    },

    async register({ initData, name, email, password }) {
      const actor = validateLaunch(initData);
      return db.$transaction(async (tx) => {
        const existingConnection = await tx.telegramConnection.findUnique({
          where: { telegramUserId: actor.telegramUserId },
          select: { id: true },
        });
        if (existingConnection) throw conflict();

        const user = await createUserWithCredentials({
          db: tx,
          input: { name, email, password },
        });
        const connection = await tx.telegramConnection.create({
          data: {
            userId: user.id,
            telegramUserId: actor.telegramUserId,
            chatId: actor.telegramUserId,
          },
          select: { id: true },
        });
        return { connectionId: connection.id, user: toSafeUser(user) };
      });
    },

    async login({ initData, email, password }) {
      const actor = validateLaunch(initData);
      const user = await verifyUserCredentials({ db, email, password });
      return db.$transaction(async (tx) => {
        const [telegramConnection, userConnection] = await Promise.all([
          tx.telegramConnection.findUnique({
            where: { telegramUserId: actor.telegramUserId },
            select: { id: true, userId: true },
          }),
          tx.telegramConnection.findUnique({
            where: { userId: user.id },
            select: { id: true, telegramUserId: true },
          }),
        ]);
        if (
          (telegramConnection && telegramConnection.userId !== user.id) ||
          (userConnection && userConnection.telegramUserId !== actor.telegramUserId)
        ) {
          throw conflict();
        }
        const connection = telegramConnection || userConnection ||
          (await tx.telegramConnection.create({
            data: {
              userId: user.id,
              telegramUserId: actor.telegramUserId,
              chatId: actor.telegramUserId,
            },
            select: { id: true, userId: true },
          }));
        return { connectionId: connection.id, user: toSafeUser(user) };
      });
    },
  };
};

export const isTelegramMiniAppSessionError = (error) =>
  error instanceof TelegramMiniAppSessionError ||
  error instanceof TelegramMiniAppAuthError ||
  error instanceof CredentialsError;

export default createTelegramMiniAppSessionService;
