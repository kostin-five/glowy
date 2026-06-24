import "dotenv/config";
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PORT = process.env.PORT || 3002;
const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_GEMINI_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";
const GEMINI_MODELS = [
  ...new Set([PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL].filter(Boolean)),
];
const RETRY_DELAYS_MS = [700, 1400];

const requiredEnv = [
  ["AI_PROXY_SECRET", AI_PROXY_SECRET],
  ["GEMINI_API_KEY", GEMINI_API_KEY],
].filter(([, value]) => !value);

if (requiredEnv.length) {
  console.error(
    `AI proxy cannot start. Missing required env: ${requiredEnv
      .map(([name]) => name)
      .join(", ")}`
  );
  process.exit(1);
}

const app = express();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

const normalizeGeminiErrorCode = (error) => {
  const status = getErrorStatus(error);
  const text = getErrorText(error);

  if (
    text.includes("user location is not supported") ||
    text.includes("location is not supported") ||
    text.includes("unsupported location")
  ) {
    return "GEMINI_UNSUPPORTED_LOCATION";
  }

  if (
    status === 429 ||
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("resource exhausted")
  ) {
    return "GEMINI_QUOTA_EXCEEDED";
  }

  if (
    status === 503 ||
    text.includes("high demand") ||
    text.includes("service unavailable") ||
    text.includes("try again later") ||
    text.includes("overloaded") ||
    text.includes("temporarily unavailable")
  ) {
    return "GEMINI_OVERLOADED";
  }

  return "GEMINI_REQUEST_FAILED";
};

const isRetryableGeminiError = (error) => {
  const code = normalizeGeminiErrorCode(error);
  const status = getErrorStatus(error);
  
  // Retry only on temporary errors: overloaded, network issues, timeouts, or 5xx
  return (
    code === "GEMINI_OVERLOADED" ||
    code === "AI_PROXY_TIMEOUT" ||
    code === "AI_PROXY_UNAVAILABLE" ||
    (status >= 500 && status <= 599)
  );
};

const getStatusForErrorCode = (code) => {
  if (code === "GEMINI_QUOTA_EXCEEDED") return 429;
  if (code === "GEMINI_OVERLOADED" || code === "GEMINI_UNSUPPORTED_LOCATION") {
    return 503;
  }
  if (code === "GEMINI_EMPTY_RESPONSE") return 502;
  return 502;
};

const createGeminiError = (code, message, cause) => {
  const error = new Error(message);
  error.code = code;
  error.cause = cause;
  return error;
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
        const code = normalizeGeminiErrorCode(error);
        const isLastAttemptForModel = attemptIndex === RETRY_DELAYS_MS.length;

        if (!isRetryableGeminiError(error)) {
          throw createGeminiError(code, "AI request failed.", error);
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

  const code = normalizeGeminiErrorCode(lastError);
  throw createGeminiError(code, "AI request failed.", lastError);
};

const readGeminiText = (result) => {
  const text = result?.response?.text?.().trim() || "";

  if (!text) {
    throw createGeminiError(
      "GEMINI_EMPTY_RESPONSE",
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
            code: "GEMINI_REQUEST_FAILED",
            message: "Prompt is required.",
          },
        });
      }

      response = await runGeminiWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return model.generateContent(prompt);
      }, contextLabel);
    } else if (operation === "chat") {
      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "GEMINI_REQUEST_FAILED",
            message: "Message is required.",
          },
        });
      }

      response = await runGeminiWithRetry(async (modelName) => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          ...(generationConfig ? { generationConfig } : {}),
          ...(systemInstruction ? { systemInstruction } : {}),
        });
        const chat = model.startChat({
          history: Array.isArray(history) ? history : [],
        });

        return chat.sendMessage(message);
      }, contextLabel);
    } else {
      return res.status(400).json({
        ok: false,
        error: {
          code: "GEMINI_REQUEST_FAILED",
          message: "Unsupported operation.",
        },
      });
    }

    const text = readGeminiText(response.result);

    console.info("AI proxy request completed", {
      operation,
      contextLabel,
      modelUsed: response.modelUsed,
      durationMs: Date.now() - startedAt,
    });

    return res.json({
      ok: true,
      text,
      modelUsed: response.modelUsed,
    });
  } catch (error) {
    const code = error?.code || normalizeGeminiErrorCode(error);

    console.error("AI proxy request failed", {
      operation,
      contextLabel,
      code,
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
