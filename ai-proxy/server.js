import "dotenv/config";
import express from "express";

const PORT = process.env.PORT || 3002;
const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const AI_PROVIDER_TIMEOUT_MS = Number(
  process.env.AI_PROVIDER_TIMEOUT_MS || 30_000
);

const missingEnv = [
  ["AI_PROXY_SECRET", AI_PROXY_SECRET],
  ["DEEPSEEK_API_KEY", DEEPSEEK_API_KEY],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingEnv.length) {
  console.error(
    `AI proxy cannot start. Missing required env: ${missingEnv.join(", ")}`
  );
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

const requireProxyAuth = (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (token !== AI_PROXY_SECRET) {
    return res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED_PROXY_REQUEST", message: "Unauthorized." },
    });
  }

  return next();
};

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "glowy-ai-proxy" });
});

app.post("/v1/chat/completions", requireProxyAuth, async (req, res) => {
  const startedAt = Date.now();
  const { messages, generationConfig = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      ok: false,
      error: { code: "AI_PROVIDER_BAD_REQUEST", message: "Messages are required." },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        stream: false,
        ...(Number.isFinite(generationConfig.temperature)
          ? { temperature: generationConfig.temperature }
          : {}),
        ...(Number.isFinite(generationConfig.topP)
          ? { top_p: generationConfig.topP }
          : {}),
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      return res.status(response.status).json({
        ok: false,
        error: {
          code: retryable
            ? "AI_PROVIDER_TEMPORARILY_UNAVAILABLE"
            : "AI_PROVIDER_REQUEST_REJECTED",
          message: "AI provider request failed.",
        },
      });
    }

    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(502).json({
        ok: false,
        error: {
          code: "AI_PROVIDER_EMPTY_RESPONSE",
          message: "AI provider returned an empty response.",
        },
      });
    }

    console.info("AI proxy request completed", {
      providerUsed: "deepseek",
      modelUsed: payload?.model || DEEPSEEK_MODEL,
      durationMs: Date.now() - startedAt,
    });

    return res.json({
      ok: true,
      text: text.trim(),
      providerUsed: "deepseek",
      modelUsed: payload?.model || DEEPSEEK_MODEL,
      usage: {
        promptTokens: Number(payload?.usage?.prompt_tokens) || 0,
        completionTokens: Number(payload?.usage?.completion_tokens) || 0,
        totalTokens: Number(payload?.usage?.total_tokens) || 0,
      },
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("AI proxy request failed", {
      code: timedOut ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_NETWORK_ERROR",
      durationMs: Date.now() - startedAt,
    });

    return res.status(503).json({
      ok: false,
      error: {
        code: timedOut ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_NETWORK_ERROR",
        message: "AI provider is temporarily unavailable.",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`Glowy AI proxy is running on port ${PORT}`);
});
