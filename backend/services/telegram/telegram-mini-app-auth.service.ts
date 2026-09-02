import crypto from "node:crypto";
import { isUnknownRecord } from "../../types/boundaries.js";

const DEFAULT_MAX_AGE_SECONDS = 300;
const MAX_INIT_DATA_LENGTH = 16_384;

export class TelegramMiniAppAuthError extends Error {
  code: string;
  status: number;

  constructor(
    code: string,
    message = "Не удалось подтвердить запуск Telegram",
    status = 401
  ) {
    super(message);
    this.name = "TelegramMiniAppAuthError";
    this.code = code;
    this.status = status;
  }
}

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left || "", "utf8");
  const rightBuffer = Buffer.from(right || "", "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export const createTelegramMiniAppAuthService = ({
  botToken = process.env.TELEGRAM_BOT_TOKEN,
  maxAgeSeconds = Number(
    process.env.TELEGRAM_MINI_APP_INIT_MAX_AGE_SECONDS || DEFAULT_MAX_AGE_SECONDS
  ),
  now = () => new Date(),
}: {
  botToken?: string;
  maxAgeSeconds?: number;
  now?: () => Date;
} = {}) => ({
  validate(initData: unknown) {
    if (!botToken) {
      throw new TelegramMiniAppAuthError(
        "TELEGRAM_NOT_CONFIGURED",
        "Telegram пока не настроен",
        503
      );
    }
    if (
      typeof initData !== "string" ||
      !initData ||
      initData.length > MAX_INIT_DATA_LENGTH
    ) {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_INVALID");
    }

    const params = new URLSearchParams(initData);
    const entries = [...params.entries()];
    if (new Set(entries.map(([key]) => key)).size !== entries.length) {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_INVALID");
    }
    const receivedHash = params.get("hash");
    if (!/^[a-f0-9]{64}$/i.test(receivedHash || "")) {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_INVALID");
    }

    const dataCheckString = entries
      .filter(([key]) => key !== "hash")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");
    if (!safeEqual(receivedHash!.toLowerCase(), expectedHash)) {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_INVALID");
    }

    const authDate = Number(params.get("auth_date"));
    const currentSeconds = Math.floor(now().getTime() / 1000);
    const configuredMaxAge = Number.isFinite(maxAgeSeconds)
      ? Math.min(300, Math.max(1, maxAgeSeconds))
      : DEFAULT_MAX_AGE_SECONDS;
    if (
      !Number.isSafeInteger(authDate) ||
      authDate > currentSeconds + 30 ||
      currentSeconds - authDate > configuredMaxAge
    ) {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_EXPIRED");
    }

    let user: unknown;
    try {
      user = JSON.parse(params.get("user") || "null");
    } catch {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_INVALID");
    }
    if (
      !isUnknownRecord(user) ||
      !Number.isSafeInteger(user.id) ||
      typeof user.id !== "number" ||
      user.id <= 0
    ) {
      throw new TelegramMiniAppAuthError("TELEGRAM_INIT_DATA_INVALID");
    }

    return {
      telegramUserId: String(user.id),
      authDate,
      queryId: params.get("query_id"),
    };
  },
});

export default createTelegramMiniAppAuthService;
