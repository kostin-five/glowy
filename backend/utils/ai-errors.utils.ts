import { isRetryableAiProviderError } from "../services/ai/ai-provider.service.js";
import { getErrorCode } from "../types/boundaries.js";

export const getMindHubAiErrorResponse = () => ({
  error:
    "Glowy не смог получить ответ от ИИ. Попробуй отправить сообщение ещё раз.",
});

export const getMindHubErrorResponse = (error: unknown) => {
  if (isRetryableAiProviderError(error)) {
    return {
      status: 503,
      body: {
        error: "ИИ сейчас перегружен, попробуй через минуту.",
        retryable: true,
      },
    };
  }

  const errorCode = getErrorCode(error);
  if (
    errorCode &&
    ["AI_PROVIDER_CONFIG_MISSING", "AI_PROVIDER_AUTH_FAILED"].includes(errorCode)
  ) {
    return {
      status: 503,
      body: {
        error: "ИИ временно недоступен. Попробуй чуть позже.",
        retryable: false,
      },
    };
  }

  return {
    status: 503,
    body: {
      ...getMindHubAiErrorResponse(),
      retryable: false,
    },
  };
};

export const EXPECTED_AI_UNAVAILABLE_CODES = new Set([
  "AI_PROVIDER_CONFIG_MISSING",
  "AI_PROVIDER_AUTH_FAILED",
  "AI_PROVIDER_REQUEST_REJECTED",
  "AI_PROVIDER_EMPTY_RESPONSE",
  "AI_PROVIDER_TIMEOUT",
  "AI_PROVIDER_NETWORK_ERROR",
  "AI_PROVIDER_CIRCUIT_OPEN",
  "AI_PROVIDER_TEMPORARILY_UNAVAILABLE",
  "AI_PROVIDERS_UNAVAILABLE",
]);

export const isExpectedAiUnavailableError = (error: unknown): boolean =>
  EXPECTED_AI_UNAVAILABLE_CODES.has(getErrorCode(error) || "");

export const buildGracefulMindHubUnavailablePayload = (
  error: unknown,
  extra: Record<string, unknown> = {}
) => {
  const { body } = getMindHubErrorResponse(error);

  return {
    drafts: [],
    reply: body.error || getMindHubAiErrorResponse().error,
    aiUnavailable: true,
    retryable: Boolean(body.retryable),
    code: "AI_TEMPORARILY_UNAVAILABLE",
    ...extra,
  };
};
