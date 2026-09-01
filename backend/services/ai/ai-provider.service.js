import crypto from "node:crypto";
import { logger } from "../../lib/logger.js";
import { recordSuccessfulAiUsageSafely } from "../analytics/ai-usage-accounting.service.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const TOKEN_EXPIRY_SAFETY_MS = 60_000;

let gigaChatTokenCache = null;

export const createProviderBudget = ({
  timeoutMs = getTimeoutMs(),
  now = () => Date.now(),
} = {}) => {
  const deadline = now() + timeoutMs;
  let exhausted = false;
  return {
    deadline,
    remaining: () => (exhausted ? 0 : Math.max(0, deadline - now())),
    exhaust: () => {
      exhausted = true;
    },
  };
};

export const createAiCircuitBreaker = ({
  now = () => Date.now(),
  failureThreshold = 3,
  openMs = 30_000,
} = {}) => {
  let state = "closed";
  let retryableFailures = 0;
  let openedUntil = 0;
  let probeInFlight = false;

  const beforeRequest = () => {
    if (state === "closed") return { allowed: true, probe: false };
    if (state === "open" && now() >= openedUntil && !probeInFlight) {
      state = "half-open";
      probeInFlight = true;
      return { allowed: true, probe: true };
    }
    return {
      allowed: false,
      probe: false,
      retryAfterMs: Math.max(0, openedUntil - now()),
    };
  };

  const recordSuccess = () => {
    state = "closed";
    retryableFailures = 0;
    openedUntil = 0;
    probeInFlight = false;
  };

  const recordFailure = (retryable) => {
    if (!retryable) {
      if (state === "half-open") recordSuccess();
      return;
    }

    retryableFailures += 1;
    if (state === "half-open" || retryableFailures >= failureThreshold) {
      state = "open";
      openedUntil = now() + openMs;
      probeInFlight = false;
    }
  };

  const reset = () => recordSuccess();
  const getState = () => ({ state, retryableFailures, openedUntil });

  return { beforeRequest, recordSuccess, recordFailure, reset, getState };
};

const providerCircuit = createAiCircuitBreaker();

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
  budget,
}) => {
  const timeoutMs = budget?.remaining() ?? getTimeoutMs();
  if (timeoutMs <= 0) {
    throw createAiProviderError({
      code: "AI_PROVIDER_TIMEOUT",
      message: "AI provider request timed out.",
      status: 503,
      retryable: true,
      provider,
      operation,
    });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));

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
      // A request-level abort is the deadline firing for the shared provider
      // budget. Mark it exhausted so a slightly early timer cannot start the
      // fallback with a new network call.
      budget?.exhaust?.();
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

const callDeepSeek = async ({ messages, generationConfig }, budget) => {
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
    budget,
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

const getGigaChatAccessToken = async ({ forceRefresh = false, budget } = {}) => {
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
    budget,
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

const requestGigaChatCompletion = async ({
  messages,
  generationConfig,
  token,
  budget,
}) => {
  const baseUrl = (process.env.GIGACHAT_BASE_URL || "https://api.giga.chat").replace(
    /\/$/,
    ""
  );
  const model = process.env.GIGACHAT_MODEL || "GigaChat";
  const payload = await requestJson({
    url: `${baseUrl}/v1/chat/completions`,
    provider: "gigachat",
    operation: "completion",
    budget,
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

const callGigaChat = async (request, budget) => {
  const token = await getGigaChatAccessToken({ budget });

  try {
    return await requestGigaChatCompletion({ ...request, token, budget });
  } catch (error) {
    if (error?.status !== 401) throw error;

    gigaChatTokenCache = null;
    const refreshedToken = await getGigaChatAccessToken({
      forceRefresh: true,
      budget,
    });
    return requestGigaChatCompletion({
      ...request,
      token: refreshedToken,
      budget,
    });
  }
};

const callAiProxy = async (request, budget) => {
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
    budget,
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

const runDirectProviders = async (request, contextLabel, budget) => {
  try {
    return await callDeepSeek(request, budget);
  } catch (primaryError) {
    if (!primaryError?.retryable) throw primaryError;

    logger.info("ai.provider.fallback_started", {
      context: contextLabel,
      code: primaryError.code,
      status: primaryError.status,
    });

    try {
      return await callGigaChat(request, budget);
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

const runProviderRequest = async (request, contextLabel, accountingContext) => {
  const startedAt = Date.now();
  const circuitPermission = providerCircuit.beforeRequest();
  if (!circuitPermission.allowed) {
    logger.info("ai.provider.circuit_rejected", {
      code: "AI_PROVIDER_CIRCUIT_OPEN",
      status: providerCircuit.getState().state,
      retryable: true,
      durationMs: 0,
    });
    throw createAiProviderError({
      code: "AI_PROVIDER_CIRCUIT_OPEN",
      message: "AI provider circuit is open.",
      status: 503,
      retryable: true,
      operation: "circuit",
    });
  }
  const budget = createProviderBudget();
  let result;

  try {
    result =
      (process.env.AI_PROVIDER_MODE || "direct").toLowerCase() === "proxy"
        ? await callAiProxy(request, budget)
        : await runDirectProviders(request, contextLabel, budget);
    providerCircuit.recordSuccess();
  } catch (error) {
    providerCircuit.recordFailure(Boolean(error?.retryable));
    logger.info("ai.provider.failed", {
      provider: error?.provider || "unknown",
      operation: error?.operation || "unknown",
      code: error?.code || "AI_PROVIDER_UNKNOWN_ERROR",
      statusCode: error?.status || 503,
      status: providerCircuit.getState().state,
      retryable: Boolean(error?.retryable),
      durationMs: Date.now() - startedAt,
      remaining: budget.remaining(),
    });
    throw error;
  }

  logger.info("ai.provider.completed", {
    context: contextLabel,
    provider: result.providerUsed,
    model: result.modelUsed,
    durationMs: Date.now() - startedAt,
    promptTokens: result.usage?.promptTokens || 0,
    completionTokens: result.usage?.completionTokens || 0,
    totalTokens: result.usage?.totalTokens || 0,
  });

  await recordSuccessfulAiUsageSafely(accountingContext, result);

  return result;
};

export const generateContentWithAiProvider = async (
  prompt,
  contextLabel,
  accountingContext
) =>
  runProviderRequest(
    { messages: buildMessages({ prompt }), generationConfig: {} },
    contextLabel,
    accountingContext
  );

export const chatWithAiProvider = async ({
  message,
  history,
  systemInstruction,
  generationConfig,
  contextLabel,
  accountingContext,
}) =>
  runProviderRequest(
    {
      messages: buildMessages({ message, history, systemInstruction }),
      generationConfig: generationConfig || {},
    },
    contextLabel,
    accountingContext
  );

export const isRetryableAiProviderError = (error) => Boolean(error?.retryable);

export const resetAiProviderStateForTests = () => {
  gigaChatTokenCache = null;
  providerCircuit.reset();
};
