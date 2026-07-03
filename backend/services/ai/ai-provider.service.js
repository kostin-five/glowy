import { GoogleGenerativeAI } from "@google/generative-ai";

export const AI_PROVIDER = (process.env.AI_PROVIDER || "proxy").toLowerCase();
export const AI_PROXY_URL = (process.env.AI_PROXY_URL || "").replace(/\/$/, "");
export const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET || "";
export const AI_PROXY_TIMEOUT_MS = Number(process.env.AI_PROXY_TIMEOUT_MS || 120000);
export const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const FALLBACK_GEMINI_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";
export const GEMINI_MODELS = [
  ...new Set([PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL].filter(Boolean)),
];
export const GEMINI_RETRY_DELAYS_MS = [700, 1400];

let genAI = null;

export const getGeminiClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required for direct Gemini provider");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

export const createAiProviderError = ({ code, message, status, cause }) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.cause = cause;
  return error;
};

export const getProxyErrorStatus = (code, fallbackStatus = 503) => {
  if (code === "UNAUTHORIZED_PROXY_REQUEST") return 502;
  if (code === "GEMINI_QUOTA_EXCEEDED") return 503;
  if (
    code === "GEMINI_OVERLOADED" ||
    code === "GEMINI_UNSUPPORTED_LOCATION" ||
    code === "AI_PROXY_TIMEOUT" ||
    code === "AI_PROXY_UNAVAILABLE"
  ) {
    return 503;
  }
  return fallbackStatus;
};

export const normalizeProxyError = (payload, responseStatus) => {
  const code = payload?.error?.code || "AI_PROXY_REQUEST_FAILED";
  const message = payload?.error?.message || "AI proxy request failed.";

  return createAiProviderError({
    code,
    message,
    status: getProxyErrorStatus(code, responseStatus),
  });
};

export const callAiProxy = async (body) => {
  if (!AI_PROXY_URL || !AI_PROXY_SECRET) {
    throw createAiProviderError({
      code: "AI_PROXY_CONFIG_MISSING",
      message: "AI proxy is not configured.",
      status: 500,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, AI_PROXY_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_PROXY_URL}/v1/gemini`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_PROXY_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      throw normalizeProxyError(payload, response.status);
    }

    const text = typeof payload.text === "string" ? payload.text : "";

    if (!text.trim()) {
      throw createAiProviderError({
        code: "GEMINI_EMPTY_RESPONSE",
        message: "AI proxy returned an empty response.",
        status: 502,
      });
    }

    return {
      text,
      modelUsed: payload.modelUsed || null,
    };
  } catch (error) {
    if (error?.code) throw error;

    if (error?.name === "AbortError") {
      throw createAiProviderError({
        code: "AI_PROXY_TIMEOUT",
        message: "AI proxy request timed out.",
        status: 503,
        cause: error,
      });
    }

    throw createAiProviderError({
      code: "AI_PROXY_UNAVAILABLE",
      message: "AI proxy is unavailable.",
      status: 503,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const isGeminiOverloadedError = (error) => {
  const status = error?.status || error?.response?.status;
  const text = `${error?.message || ""} ${error?.statusText || ""}`.toLowerCase();

  return (
    error?.code === "GEMINI_OVERLOADED" ||
    (status === 503 &&
      (text.includes("high demand") ||
        text.includes("service unavailable") ||
        text.includes("try again later")))
  );
};

export const runGeminiWithRetry = async (requestFactory, contextLabel) => {
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    for (
      let attemptIndex = 0;
      attemptIndex <= GEMINI_RETRY_DELAYS_MS.length;
      attemptIndex += 1
    ) {
      try {
        const result = await requestFactory(modelName);
        return { result, modelUsed: modelName };
      } catch (error) {
        lastError = error;

        if (!isGeminiOverloadedError(error)) {
          throw error;
        }

        const isLastAttemptForModel =
          attemptIndex === GEMINI_RETRY_DELAYS_MS.length;
        console.warn(
          `${contextLabel} Gemini model ${modelName} overloaded, attempt ${attemptIndex + 1}`
        );

        if (!isLastAttemptForModel) {
          await sleep(GEMINI_RETRY_DELAYS_MS[attemptIndex]);
        }
      }
    }
  }

  throw lastError;
};

const sleep = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const generateContentWithAiProvider = async (prompt, contextLabel) => {
  if (AI_PROVIDER === "proxy") {
    return callAiProxy({
      operation: "generateContent",
      prompt,
      contextLabel,
    });
  }

  const { result, modelUsed } = await runGeminiWithRetry(async (modelName) => {
    const model = getGeminiClient().getGenerativeModel({ model: modelName });
    return model.generateContent(prompt);
  }, contextLabel);

  return {
    text: result.response.text(),
    modelUsed,
  };
};

export const chatWithAiProvider = async ({
  message,
  history,
  systemInstruction,
  generationConfig,
  contextLabel,
}) => {
  if (AI_PROVIDER === "proxy") {
    return callAiProxy({
      operation: "chat",
      message,
      history,
      systemInstruction,
      generationConfig,
      contextLabel,
    });
  }

  const { result, modelUsed } = await runGeminiWithRetry(async (modelName) => {
    const model = getGeminiClient().getGenerativeModel({
      model: modelName,
      generationConfig,
      systemInstruction,
    });
    const chat = model.startChat({
      history,
    });

    return chat.sendMessage(message);
  }, contextLabel);

  return {
    text: result.response.text(),
    modelUsed,
  };
};
