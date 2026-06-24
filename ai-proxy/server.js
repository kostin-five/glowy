import "dotenv/config";
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PORT = process.env.PORT || 3002;
const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET;
const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_GEMINI_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";
const GEMINI_MODELS = [
  ...new Set([PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL].filter(Boolean)),
];

// DeepSeek config
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const AI_PROVIDER_TIMEOUT_MS = 120000;

const RETRY_DELAYS_MS = [700, 1400];

const requiredEnv = [
  ["AI_PROXY_SECRET", AI_PROXY_SECRET],
].filter(([, value]) => !value);

if (AI_PROVIDER === "deepseek") {
  if (!DEEPSEEK_API_KEY) requiredEnv.push(["DEEPSEEK_API_KEY", null]);
} else {
  if (!GEMINI_API_KEY) requiredEnv.push(["GEMINI_API_KEY", null]);
}

if (requiredEnv.length) {
  console.error(
    `AI proxy cannot start. Missing required env: ${requiredEnv
      .map(([name]) => name)
      .join(", ")}`
  );
  process.exit(1);
}

const app = express();
let genAI = null;

app.use(express.json({ limit: "1mb" }));

const sleep = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getErrorStatus = (error) => error?.status || error?.response?.status;

const getErrorText = (error) =>
  [
    error?.message,
    error?.statusText,
    typeof error?.errorDetails === "string"
      ? error.errorDetails
      : JSON.stringify(error?.errorDetails || ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const normalizeProviderErrorCode = (error) => {
  const status = getErrorStatus(error);
  const text = getErrorText(error);
  const errCode = error?.code || "";
  const errName = error?.name || "";

  if (status === 400) return "AI_PROVIDER_BAD_REQUEST";
  if (status === 401 || status === 403) return "AI_PROVIDER_AUTH_FAILED";
  if (status === 429) return "AI_PROVIDER_QUOTA_EXCEEDED";

  if (
    text.includes("user location is not supported") ||
    text.includes("location is not supported") ||
    text.includes("unsupported location")
  ) {
    return "GEMINI_UNSUPPORTED_LOCATION";
  }

  if (
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("resource exhausted")
  ) {
    return "AI_PROVIDER_QUOTA_EXCEEDED";
  }

  if (
    ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"].includes(errCode) ||
    errName === "AbortError" ||
    status === 503 ||
    status === 502 ||
    status === 504 ||
    (status >= 500 && status <= 599) ||
    text.includes("timeout") ||
    text.includes("network") ||
    text.includes("fetch failed") ||
    text.includes("socket hang up") ||
    text.includes("high demand") ||
    text.includes("service unavailable") ||
    text.includes("try again later") ||
    text.includes("overloaded") ||
    text.includes("temporarily unavailable")
  ) {
    return "AI_PROVIDER_UNAVAILABLE";
  }

  return "AI_REQUEST_FAILED";
};

const isRetryableError = (error) => {
  const status = getErrorStatus(error);
  const errCode = error?.code || "";
  const errName = error?.name || "";
  const errMsg = (error?.message || "").toLowerCase();

  const isTransientNetworkError =
    ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"].includes(errCode) ||
    errName === "AbortError" ||
    errMsg.includes("timeout") ||
    errMsg.includes("network") ||
    errMsg.includes("fetch failed") ||
    errMsg.includes("socket hang up");

  return (
    isTransientNetworkError ||
    (status >= 500 && status <= 599)
  );
};

const getValidNumber = (value) => (typeof value === "number" ? value : undefined);

const extractHistoryContent = (item) => {
  if (typeof item?.content === "string") return item.content.trim();
  if (typeof item?.message === "string") return item.message.trim();

  if (Array.isArray(item?.parts)) {
    return item.parts
      .map((part) => (typeof part?.text === "string" ? part.text.trim() : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
};

const normalizeDeepSeekHistory = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const content = extractHistoryContent(item);
      if (!content) return null;

      if (item?.role === "user") {
        return { role: "user", content };
      }

      if (item?.role === "model" || item?.role === "assistant") {
        return { role: "assistant", content };
      }

      return null;
    })
    .filter(Boolean);
};

const buildDeepSeekMessages = ({
  operation,
  prompt,
  message,
  history,
  systemInstruction,
}) => {
  if (operation === "generateContent") {
    return [{ role: "user", content: prompt }];
  }

  const messages = [];

  if (typeof systemInstruction === "string" && systemInstruction.trim()) {
    messages.push({ role: "system", content: systemInstruction.trim() });
  }

  messages.push(...normalizeDeepSeekHistory(history));
  messages.push({ role: "user", content: message });

  return messages;
};

const getStatusForErrorCode = (code) => {
  if (code === "AI_PROVIDER_BAD_REQUEST") return 400;
  if (code === "AI_PROVIDER_QUOTA_EXCEEDED") return 429;
  if (code === "AI_PROVIDER_AUTH_FAILED") return 401;
  if (code === "AI_PROVIDER_UNAVAILABLE" || code === "GEMINI_UNSUPPORTED_LOCATION") {
    return 503;
  }
  if (code === "AI_EMPTY_RESPONSE") return 502;
  return 502;
};

const createAiError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  error.cause = cause;
  return error;
};

const getGeminiClient = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return genAI;
};

const runDeepSeekWithRetry = async ({
  messages,
  generationConfig,
  contextLabel,
}) => {
  let lastError = null;

  for (let attemptIndex = 0; attemptIndex <= RETRY_DELAYS_MS.length; attemptIndex += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, AI_PROVIDER_TIMEOUT_MS);

    try {
      const requestBody = {
        model: DEEPSEEK_MODEL,
        messages,
        stream: false,
      };
      const temperature = getValidNumber(generationConfig?.temperature);
      const topP = getValidNumber(generationConfig?.topP);

      if (temperature !== undefined) requestBody.temperature = temperature;
      if (topP !== undefined) requestBody.top_p = topP;

      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(data?.error?.message || "AI provider request failed.");
        error.status = response.status;
        throw error;
      }

      const text = data?.choices?.[0]?.message?.content?.trim() || "";
      if (!text) {
        throw createAiError("AI_EMPTY_RESPONSE", "DeepSeek returned an empty response.");
      }

      return { text, modelUsed: DEEPSEEK_MODEL, providerUsed: "deepseek" };
    } catch (error) {
      lastError = error;
      const code = normalizeProviderErrorCode(error);
      const isLastAttempt = attemptIndex === RETRY_DELAYS_MS.length;

      if (!isRetryableError(error)) {
        throw createAiError(code, "AI request failed.", error);
      }

      if (isLastAttempt) break;
      await sleep(RETRY_DELAYS_MS[attemptIndex]);
    } finally {
      clearTimeout(timeout);
    }
  }

  const code = normalizeProviderErrorCode(lastError);
  throw createAiError(code, "AI request failed.", lastError);
};

const runGeminiWithRetry = async (requestFactory, contextLabel) => {
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    for (
      let attemptIndex = 0;
      attemptIndex <= RETRY_DELAYS_MS.length;
      attemptIndex += 1
    ) {
      try {
        const result = await requestFactory(modelName);
        return { result, modelUsed: modelName };
      } catch (error) {
        lastError = error;
        const code = normalizeProviderErrorCode(error);
        const isLastAttemptForModel = attemptIndex === RETRY_DELAYS_MS.length;

        if (!isRetryableError(error)) {
          throw createAiError(code, "AI request failed.", error);
        }

        if (isLastAttemptForModel) {
          console.warn("AI proxy Gemini request failed after retries", {
            contextLabel,
            modelUsed: modelName,
            code,
          });
          break;
        }

        await sleep(RETRY_DELAYS_MS[attemptIndex]);
      }
    }
  }

  const code = normalizeProviderErrorCode(lastError);
  throw createAiError(code, "AI request failed.", lastError);
};

const readGeminiText = (result) => {
  const text = result?.response?.text?.().trim() || "";

  if (!text) {
    throw createAiError(
      "AI_EMPTY_RESPONSE",
      "Gemini returned an empty response."
    );
  }

  return text;
};

const sendUnauthorizedProxyResponse = (res) =>
  res.status(401).json({
    ok: false,
    error: {
      code: "UNAUTHORIZED_PROXY_REQUEST",
      message: "Unauthorized proxy request.",
    },
  });

const requireProxyAuth = (req, res, next) => {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (token !== AI_PROXY_SECRET) {
    return sendUnauthorizedProxyResponse(res);
  }

  return next();
};

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "glowy-ai-proxy",
  });
});

app.post("/v1/gemini", requireProxyAuth, async (req, res) => {
  const startedAt = Date.now();
  const {
    operation,
    prompt,
    message,
    history = [],
    systemInstruction,
    generationConfig,
    contextLabel = "Gemini request",
  } = req.body || {};

  try {
    let response;

    if (operation === "generateContent") {
      if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "AI_PROVIDER_BAD_REQUEST",
            message: "Prompt is required.",
          },
        });
      }

      if (AI_PROVIDER === "deepseek") {
        response = await runDeepSeekWithRetry({
          messages: buildDeepSeekMessages({
            operation,
            prompt: prompt.trim(),
          }),
          generationConfig,
          contextLabel,
        });
      } else {
        response = await runGeminiWithRetry(async (modelName) => {
          const model = getGeminiClient().getGenerativeModel({ model: modelName });
          return model.generateContent(prompt);
        }, contextLabel);
      }
    } else if (operation === "chat") {
      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "AI_PROVIDER_BAD_REQUEST",
            message: "Message is required.",
          },
        });
      }

      if (AI_PROVIDER === "deepseek") {
        response = await runDeepSeekWithRetry({
          messages: buildDeepSeekMessages({
            operation,
            message: message.trim(),
            history,
            systemInstruction,
          }),
          generationConfig,
          contextLabel,
        });
      } else {
        response = await runGeminiWithRetry(async (modelName) => {
          const model = getGeminiClient().getGenerativeModel({
            model: modelName,
            ...(generationConfig ? { generationConfig } : {}),
            ...(systemInstruction ? { systemInstruction } : {}),
          });
          const chat = model.startChat({
            history: Array.isArray(history) ? history : [],
          });

          return chat.sendMessage(message);
        }, contextLabel);
      }
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: "AI_PROVIDER_BAD_REQUEST",
          message: "Unsupported operation.",
        },
      });
    }

    const text =
      AI_PROVIDER === "deepseek" ? response.text : readGeminiText(response.result);
    const modelUsed = response.modelUsed;
    const providerUsed =
      response.providerUsed || (AI_PROVIDER === "deepseek" ? "deepseek" : "gemini");

    console.info("AI proxy request completed", {
      operation,
      contextLabel,
      providerUsed,
      modelUsed,
      durationMs: Date.now() - startedAt,
    });

    return res.json({
      ok: true,
      text,
      modelUsed,
      providerUsed,
    });
  } catch (error) {
    const code = error?.code || normalizeProviderErrorCode(error);
    const status = getErrorStatus(error) || getStatusForErrorCode(code);

    console.error("AI proxy request failed", {
      operation,
      contextLabel,
      providerUsed: AI_PROVIDER,
      modelUsed: AI_PROVIDER === "deepseek" ? DEEPSEEK_MODEL : PRIMARY_GEMINI_MODEL,
      code,
      status,
      durationMs: Date.now() - startedAt,
    });

    return res.status(getStatusForErrorCode(code)).json({
      ok: false,
      error: {
        code,
        message: "AI request failed.",
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Glowy AI proxy is running on port ${PORT}`);
});
