import crypto from "node:crypto";
import { logger } from "../../lib/logger.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const TOKEN_EXPIRY_SAFETY_MS = 60_000;

let gigaChatTokenCache = null;

export const createAiProviderError = ({
  code,
  message,
  status = 503,
  retryable = false,
  provider = null,
  operation = null,
  providerCode = null,
  cause,
}) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.retryable = retryable;
  error.provider = provider;
  error.operation = operation;
  error.providerCode = providerCode;
  error.cause = cause;
  return error;
};

const getTimeoutMs = () => {
  const value = Number(process.env.AI_PROVIDER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
};

const requestJson = async ({
  url,
  init,
  provider,
  operation,
  timeoutMs = getTimeoutMs(),
}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw createAiProviderError({
        code: retryable
          ? "AI_PROVIDER_TEMPORARILY_UNAVAILABLE"
          : "AI_PROVIDER_REQUEST_REJECTED",
        message: retryable
          ? "AI provider is temporarily unavailable."
          : "AI provider rejected the request.",
        status: response.status,
        retryable,
        provider,
        operation,
        providerCode:
          typeof payload?.code === "string" || typeof payload?.code === "number"
            ? String(payload.code).slice(0, 100)
            : null,
      });
    }

    return payload;
  } catch (error) {
    if (error?.code) throw error;

    if (error?.name === "AbortError") {
      throw createAiProviderError({
        code: "AI_PROVIDER_TIMEOUT",
        message: "AI provider request timed out.",
        status: 503,
        retryable: true,
        provider,
        operation,
        cause: error,
      });
    }

    throw createAiProviderError({
      code: "AI_PROVIDER_NETWORK_ERROR",
      message: "AI provider network request failed.",
      status: 503,
      retryable: true,
      provider,
      operation,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeHistory = (history = []) =>
  history
    .map((item) => {
      const role = item?.role === "model" ? "assistant" : item?.role;
      const content = Array.isArray(item?.parts)
        ? item.parts
            .map((part) => (typeof part?.text === "string" ? part.text : ""))
            .join("\n")
            .trim()
        : "";

      return role === "user" || role === "assistant" ? { role, content } : null;
    })
    .filter((item) => item?.content);

const buildMessages = ({ prompt, message, history, systemInstruction }) => {
  const messages = [];

  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }

  messages.push(...normalizeHistory(history));

  const userContent = typeof prompt === "string" ? prompt : message;
  if (typeof userContent === "string" && userContent.trim()) {
    messages.push({ role: "user", content: userContent.trim() });
  }

  return messages;
};

const readChatText = (payload, provider) => {
  const text = payload?.choices?.[0]?.message?.content;

  if (typeof text !== "string" || !text.trim()) {
    throw createAiProviderError({
      code: "AI_PROVIDER_EMPTY_RESPONSE",
      message: "AI provider returned an empty response.",
      status: 502,
      retryable: true,
      provider,
    });
  }

  return text.trim();
};

const readUsage = (payload) => ({
  promptTokens: Number(payload?.usage?.prompt_tokens) || 0,
  completionTokens: Number(payload?.usage?.completion_tokens) || 0,
  totalTokens: Number(payload?.usage?.total_tokens) || 0,
});

const callDeepSeek = async ({ messages, generationConfig }) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw createAiProviderError({
      code: "AI_PROVIDER_CONFIG_MISSING",
      message: "DeepSeek is not configured.",
      status: 500,
      provider: "deepseek",
    });
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    ""
  );
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const payload = await requestJson({
    url: `${baseUrl}/chat/completions`,
    provider: "deepseek",
    operation: "completion",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(Number.isFinite(generationConfig?.temperature)
          ? { temperature: generationConfig.temperature }
          : {}),
        ...(Number.isFinite(generationConfig?.topP)
          ? { top_p: generationConfig.topP }
          : {}),
      }),
    },
  });

  return {
    text: readChatText(payload, "deepseek"),
    providerUsed: "deepseek",
    modelUsed: payload?.model || model,
    usage: readUsage(payload),
  };
};

const isCachedGigaChatTokenValid = () =>
  Boolean(
    gigaChatTokenCache?.accessToken &&
      gigaChatTokenCache.expiresAt > Date.now() + TOKEN_EXPIRY_SAFETY_MS
  );

const getGigaChatAccessToken = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && isCachedGigaChatTokenValid()) {
    return gigaChatTokenCache.accessToken;
  }

  const authorizationKey = process.env.GIGACHAT_AUTH_KEY;
  if (!authorizationKey) {
    throw createAiProviderError({
      code: "AI_PROVIDER_CONFIG_MISSING",
      message: "GigaChat is not configured.",
      status: 500,
      provider: "gigachat",
    });
  }

  const authUrl =
    process.env.GIGACHAT_AUTH_URL ||
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  const scope = process.env.GIGACHAT_SCOPE || "GIGACHAT_API_PERS";
  const payload = await requestJson({
    url: authUrl,
    provider: "gigachat",
    operation: "oauth",
    init: {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorizationKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID(),
      },
      body: new URLSearchParams({ scope }).toString(),
    },
  });

  if (typeof payload?.access_token !== "string") {
    throw createAiProviderError({
      code: "AI_PROVIDER_AUTH_FAILED",
      message: "GigaChat authentication returned no access token.",
      status: 502,
      provider: "gigachat",
    });
  }

  const expiresAt = Number(payload.expires_at);
  gigaChatTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Number.isFinite(expiresAt)
      ? expiresAt
      : Date.now() + 29 * 60 * 1000,
  };

  return gigaChatTokenCache.accessToken;
};

const requestGigaChatCompletion = async ({ messages, generationConfig, token }) => {
  const baseUrl = (process.env.GIGACHAT_BASE_URL || "https://api.giga.chat").replace(
    /\/$/,
    ""
  );
  const model = process.env.GIGACHAT_MODEL || "GigaChat";
  const payload = await requestJson({
    url: `${baseUrl}/v1/chat/completions`,
    provider: "gigachat",
    operation: "completion",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(Number.isFinite(generationConfig?.temperature)
          ? { temperature: generationConfig.temperature }
          : {}),
        ...(Number.isFinite(generationConfig?.topP)
          ? { top_p: generationConfig.topP }
          : {}),
      }),
    },
  });

  return {
    text: readChatText(payload, "gigachat"),
    providerUsed: "gigachat",
    modelUsed: payload?.model || model,
    usage: readUsage(payload),
  };
};

const callGigaChat = async (request) => {
  const token = await getGigaChatAccessToken();

  try {
    return await requestGigaChatCompletion({ ...request, token });
  } catch (error) {
    if (error?.status !== 401) throw error;

    gigaChatTokenCache = null;
    const refreshedToken = await getGigaChatAccessToken({ forceRefresh: true });
    return requestGigaChatCompletion({ ...request, token: refreshedToken });
  }
};

const callAiProxy = async (request) => {
  const baseUrl = (process.env.AI_PROXY_URL || "").replace(/\/$/, "");
  const secret = process.env.AI_PROXY_SECRET;

  if (!baseUrl || !secret) {
    throw createAiProviderError({
      code: "AI_PROVIDER_CONFIG_MISSING",
      message: "AI proxy is not configured.",
      status: 500,
      provider: "proxy",
    });
  }

  const payload = await requestJson({
    url: `${baseUrl}/v1/chat/completions`,
    provider: "proxy",
    operation: "completion",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  });

  if (typeof payload?.text !== "string" || !payload.text.trim()) {
    throw createAiProviderError({
      code: "AI_PROVIDER_EMPTY_RESPONSE",
      message: "AI proxy returned an empty response.",
      status: 502,
      retryable: true,
      provider: "proxy",
    });
  }

  return {
    text: payload.text.trim(),
    providerUsed: payload.providerUsed || "proxy",
    modelUsed: payload.modelUsed || null,
    usage: payload.usage || null,
  };
};

const runDirectProviders = async (request, contextLabel) => {
  try {
    return await callDeepSeek(request);
  } catch (primaryError) {
    if (!primaryError?.retryable) throw primaryError;

    logger.info("ai.provider.fallback_started", {
      context: contextLabel,
      code: primaryError.code,
      status: primaryError.status,
    });

    try {
      return await callGigaChat(request);
    } catch (fallbackError) {
      logger.info("ai.provider.fallback_failed", {
        context: contextLabel,
        provider: fallbackError?.provider || "gigachat",
        operation: fallbackError?.operation || "unknown",
        providerCode: fallbackError?.providerCode || null,
        code: fallbackError?.code || "AI_PROVIDER_UNKNOWN_ERROR",
        status: fallbackError?.status || 503,
        retryable: Boolean(fallbackError?.retryable),
      });

      throw createAiProviderError({
        code: "AI_PROVIDERS_UNAVAILABLE",
        message: "All configured AI providers are unavailable.",
        status: 503,
        retryable: Boolean(fallbackError?.retryable),
        provider: "gigachat",
        cause: fallbackError,
      });
    }
  }
};

const runProviderRequest = async (request, contextLabel) => {
  const startedAt = Date.now();
  const result =
    (process.env.AI_PROVIDER_MODE || "direct").toLowerCase() === "proxy"
      ? await callAiProxy(request)
      : await runDirectProviders(request, contextLabel);

  logger.info("ai.provider.completed", {
    context: contextLabel,
    provider: result.providerUsed,
    model: result.modelUsed,
    durationMs: Date.now() - startedAt,
    promptTokens: result.usage?.promptTokens || 0,
    completionTokens: result.usage?.completionTokens || 0,
    totalTokens: result.usage?.totalTokens || 0,
  });

  return result;
};

export const generateContentWithAiProvider = async (prompt, contextLabel) =>
  runProviderRequest(
    { messages: buildMessages({ prompt }), generationConfig: {} },
    contextLabel
  );

export const chatWithAiProvider = async ({
  message,
  history,
  systemInstruction,
  generationConfig,
  contextLabel,
}) =>
  runProviderRequest(
    {
      messages: buildMessages({ message, history, systemInstruction }),
      generationConfig: generationConfig || {},
    },
    contextLabel
  );

export const isRetryableAiProviderError = (error) => Boolean(error?.retryable);

export const resetAiProviderStateForTests = () => {
  gigaChatTokenCache = null;
};
