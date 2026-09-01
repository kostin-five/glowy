import { isRetryableAiProviderError } from "../services/ai/ai-provider.service.js";

export const getMindHubAiErrorResponse = () => ({
  error:
    "Glowy не смог получить ответ от ИИ. Попробуй отправить сообщение ещё раз.",
});

export const getMindHubErrorResponse = (error) => {
  if (isRetryableAiProviderError(error)) {
    return {
      status: 503,
      body: {
        error: "ИИ сейчас перегружен, попробуй через минуту.",
        retryable: true,
      },
    };
  }

  if (
    ["AI_PROVIDER_CONFIG_MISSING", "AI_PROVIDER_AUTH_FAILED"].includes(
      error?.code
    )
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

export const isExpectedAiUnavailableError = (error) =>
  EXPECTED_AI_UNAVAILABLE_CODES.has(error?.code);

export const buildGracefulMindHubUnavailablePayload = (error, extra = {}) => {
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
