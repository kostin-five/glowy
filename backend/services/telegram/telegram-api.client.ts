import { isUnknownRecord } from "../../types/boundaries.js";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

export class TelegramApiError extends Error {
  code: string;
  retryable: boolean;
  status: number;

  constructor(
    code: string,
    { retryable = false, status = 502 }: {
      retryable?: boolean;
      status?: number;
    } = {}
  ) {
    super("Telegram API request failed");
    this.name = "TelegramApiError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export const createTelegramApiClient = ({
  token = process.env.TELEGRAM_BOT_TOKEN,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
} = {}) => {
  const request = async (
    method: string,
    payload: Record<string, unknown> = {}
  ): Promise<unknown> => {
    if (!token || typeof fetchImpl !== "function") {
      throw new TelegramApiError("TELEGRAM_NOT_CONFIGURED", { status: 503 });
    }

    let response;
    try {
      response = await fetchImpl(
        `${TELEGRAM_API_BASE_URL}/bot${token}/${method}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );
    } catch {
      throw new TelegramApiError("TELEGRAM_NETWORK_ERROR", {
        retryable: true,
        status: 503,
      });
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new TelegramApiError("TELEGRAM_INVALID_RESPONSE", {
        retryable: response.status >= 500,
        status: 502,
      });
    }

    if (!response.ok || !isUnknownRecord(body) || body.ok !== true) {
      throw new TelegramApiError("TELEGRAM_API_ERROR", {
        retryable: response.status === 429 || response.status >= 500,
        status: response.status === 429 ? 429 : 502,
      });
    }

    return body.result;
  };

  return {
    request,
    sendMessage: (payload: Record<string, unknown>) => request("sendMessage", payload),
    answerCallbackQuery: (payload: Record<string, unknown>) => request("answerCallbackQuery", payload),
    editMessageReplyMarkup: (payload: Record<string, unknown>) =>
      request("editMessageReplyMarkup", payload),
    setChatMenuButton: (payload: Record<string, unknown>) => request("setChatMenuButton", payload),
    setMyCommands: (payload: Record<string, unknown>) => request("setMyCommands", payload),
    setWebhook: (payload: Record<string, unknown>) => request("setWebhook", payload),
    getWebhookInfo: () => request("getWebhookInfo"),
  };
};

export default createTelegramApiClient;
