const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

export class TelegramApiError extends Error {
  constructor(code, { retryable = false, status = 502 } = {}) {
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
  const request = async (method, payload = {}) => {
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

    let body;
    try {
      body = await response.json();
    } catch {
      throw new TelegramApiError("TELEGRAM_INVALID_RESPONSE", {
        retryable: response.status >= 500,
        status: 502,
      });
    }

    if (!response.ok || body?.ok !== true) {
      throw new TelegramApiError("TELEGRAM_API_ERROR", {
        retryable: response.status === 429 || response.status >= 500,
        status: response.status === 429 ? 429 : 502,
      });
    }

    return body.result;
  };

  return {
    request,
    sendMessage: (payload) => request("sendMessage", payload),
    answerCallbackQuery: (payload) => request("answerCallbackQuery", payload),
    editMessageReplyMarkup: (payload) =>
      request("editMessageReplyMarkup", payload),
    setWebhook: (payload) => request("setWebhook", payload),
    getWebhookInfo: () => request("getWebhookInfo"),
  };
};

export default createTelegramApiClient;
