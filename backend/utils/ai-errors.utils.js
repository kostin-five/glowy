import { isGeminiOverloadedError } from "../services/ai/ai-provider.service.js";

export const getMindHubAiErrorResponse = () => ({
  error:
    "Glowy не смог получить ответ от ИИ. Попробуй отправить сообщение ещё раз.",
});

export const getMindHubErrorResponse = (error) => {
  if (isGeminiOverloadedError(error)) {
    return {
      status: 503,
      body: {
        error: "ИИ сейчас перегружен, попробуй через минуту.",
        retryable: true,
      },
    };
  }

  if (error?.code === "GEMINI_QUOTA_EXCEEDED") {
    return {
      status: 503,
      body: {
        error: "ИИ временно недоступен из-за лимита провайдера. Попробуй позже.",
        retryable: false,
      },
    };
  }

  if (error?.code === "GEMINI_UNSUPPORTED_LOCATION") {
    return {
      status: 503,
      body: {
        error: "ИИ временно недоступен в твоем регионе. Попробуй еще раз чуть позже.",
        retryable: false,
      },
    };
  }

  if (
    [
      "GEMINI_EMPTY_RESPONSE",
      "AI_PROXY_TIMEOUT",
      "AI_PROXY_UNAVAILABLE",
    ].includes(error?.code)
  ) {
    return {
      status: 503,
      body: {
        ...getMindHubAiErrorResponse(),
        retryable: true,
      },
    };
  }

  if (
    ["UNAUTHORIZED_PROXY_REQUEST", "AI_PROXY_CONFIG_MISSING"].includes(
      error?.code
    )
  ) {
    return {
      status: 502,
      body: {
        ...getMindHubAiErrorResponse(),
        retryable: false,
      },
    };
  }

  return {
    status: 503,
    body: {
      ...getMindHubAiErrorResponse(),
      retryable: true,
    },
  };
};

export const EXPECTED_AI_UNAVAILABLE_CODES = new Set([
  "GEMINI_UNSUPPORTED_LOCATION",
  "GEMINI_QUOTA_EXCEEDED",
  "GEMINI_EMPTY_RESPONSE",
  "AI_PROXY_TIMEOUT",
  "AI_PROXY_UNAVAILABLE",
]);

export const isExpectedAiUnavailableError = (error) =>
  isGeminiOverloadedError(error) ||
  EXPECTED_AI_UNAVAILABLE_CODES.has(error?.code);

export const buildGracefulMindHubUnavailablePayload = (error, extra = {}) => {
  const { body } = getMindHubErrorResponse(error);

  return {
    tasks: [],
    reply: body.error || getMindHubAiErrorResponse().error,
    aiUnavailable: true,
    retryable: Boolean(body.retryable),
    code: "AI_TEMPORARILY_UNAVAILABLE",
    ...extra,
  };
};
