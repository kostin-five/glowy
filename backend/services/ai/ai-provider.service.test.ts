import assert from "node:assert/strict";
import test from "node:test";
import {
  createAiCircuitBreaker,
  createProviderBudget,
  generateContentWithAiProvider,
  resetAiProviderStateForTests,
} from "./ai-provider.service.js";
import type { AiProviderError } from "./ai-provider.service.js";

const originalFetch = global.fetch;
const ENV_KEYS = [
  "AI_PROVIDER_MODE",
  "AI_PROVIDER_TIMEOUT_MS",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
  "GIGACHAT_AUTH_KEY",
  "GIGACHAT_AUTH_URL",
  "GIGACHAT_BASE_URL",
  "GIGACHAT_MODEL",
  "GIGACHAT_SCOPE",
];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const isProviderError = (error: unknown): error is AiProviderError =>
  error instanceof Error && "code" in error;

const configureDirectProviders = () => {
  process.env.AI_PROVIDER_MODE = "direct";
  process.env.DEEPSEEK_API_KEY = "deepseek-test-key";
  process.env.DEEPSEEK_BASE_URL = "https://deepseek.test";
  process.env.GIGACHAT_AUTH_KEY = "gigachat-test-key";
  process.env.GIGACHAT_AUTH_URL = "https://gigachat.test/oauth";
  process.env.GIGACHAT_BASE_URL = "https://gigachat.test";
};

const restoreEnvironment = () => {
  global.fetch = originalFetch;
  resetAiProviderStateForTests();

  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
};

test.afterEach(restoreEnvironment);

test("uses DeepSeek without calling fallback after primary success", async () => {
  configureDirectProviders();
  const calls: string[] = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    return jsonResponse({
      model: "deepseek-chat",
      choices: [{ message: { content: "primary answer" } }],
    });
  };

  const result = await generateContentWithAiProvider("hello", "provider test");

  assert.equal(result.text, "primary answer");
  assert.equal(result.providerUsed, "deepseek");
  assert.deepEqual(calls, ["https://deepseek.test/chat/completions"]);
});

test("falls back once to GigaChat after primary rate limiting", async () => {
  configureDirectProviders();
  const calls: string[] = [];
  global.fetch = async (url) => {
    const requestUrl = String(url);
    calls.push(requestUrl);

    if (requestUrl.includes("deepseek")) {
      return jsonResponse({ error: "rate limited" }, 429);
    }
    if (requestUrl.endsWith("/oauth")) {
      return jsonResponse({
        access_token: "short-lived-token",
        expires_at: Date.now() + 30 * 60 * 1000,
      });
    }
    return jsonResponse({
      model: "GigaChat",
      choices: [{ message: { content: "fallback answer" } }],
    });
  };

  const result = await generateContentWithAiProvider("hello", "provider test");

  assert.equal(result.text, "fallback answer");
  assert.equal(result.providerUsed, "gigachat");
  assert.deepEqual(calls, [
    "https://deepseek.test/chat/completions",
    "https://gigachat.test/oauth",
    "https://gigachat.test/v1/chat/completions",
  ]);
});

test("primary timeout exhausts the shared budget before fallback", async () => {
  configureDirectProviders();
  process.env.AI_PROVIDER_TIMEOUT_MS = "5";
  const calls: string[] = [];
  global.fetch = async (url, init) => {
    const requestUrl = String(url);
    calls.push(requestUrl);

    if (requestUrl.includes("deepseek")) {
      return new Promise((_, reject) => {
        const signal = init?.signal;
        assert.ok(signal);
        signal.addEventListener("abort", () => {
          const error = new Error("request aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }
    throw new Error("fallback fetch must not start after the deadline");
  };

  await assert.rejects(
    generateContentWithAiProvider("hello", "provider test"),
    (error) =>
      isProviderError(error) &&
      error.code === "AI_PROVIDERS_UNAVAILABLE" &&
      isProviderError(error.cause) &&
      error.cause.code === "AI_PROVIDER_TIMEOUT"
  );
  assert.deepEqual(calls, ["https://deepseek.test/chat/completions"]);
});

test("one provider budget is consumed across primary and fallback work", () => {
  let currentTime = 1_000;
  const budget = createProviderBudget({
    timeoutMs: 30_000,
    now: () => currentTime,
  });

  assert.equal(budget.remaining(), 30_000);
  currentTime += 21_000;
  assert.equal(budget.remaining(), 9_000);
  budget.exhaust();
  assert.equal(budget.remaining(), 0);
  currentTime += 9_001;
  assert.equal(budget.remaining(), 0);
});

test("circuit opens after three retryable failures and one probe closes it", () => {
  let currentTime = 0;
  const circuit = createAiCircuitBreaker({
    now: () => currentTime,
    failureThreshold: 3,
    openMs: 30_000,
  });

  for (let failure = 0; failure < 3; failure += 1) {
    assert.equal(circuit.beforeRequest().allowed, true);
    circuit.recordFailure(true);
  }
  assert.equal(circuit.getState().state, "open");
  assert.equal(circuit.beforeRequest().allowed, false);

  currentTime = 30_000;
  assert.deepEqual(circuit.beforeRequest(), { allowed: true, probe: true });
  assert.equal(circuit.beforeRequest().allowed, false);
  circuit.recordSuccess();
  assert.equal(circuit.getState().state, "closed");
  assert.equal(circuit.beforeRequest().allowed, true);
});

test("does not call fallback after a non-retryable primary rejection", async () => {
  configureDirectProviders();
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    return jsonResponse({ error: "bad request" }, 400);
  };

  await assert.rejects(
    generateContentWithAiProvider("hello", "provider test"),
    (error) =>
      isProviderError(error) &&
      error.code === "AI_PROVIDER_REQUEST_REJECTED" &&
      error.retryable === false
  );
  assert.equal(callCount, 1);
});

test("reuses a valid GigaChat access token across fallback requests", async () => {
  configureDirectProviders();
  let authCalls = 0;
  global.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl.includes("deepseek")) {
      return jsonResponse({ error: "unavailable" }, 503);
    }
    if (requestUrl.endsWith("/oauth")) {
      authCalls += 1;
      return jsonResponse({
        access_token: "cached-token",
        expires_at: Date.now() + 30 * 60 * 1000,
      });
    }
    return jsonResponse({
      choices: [{ message: { content: "fallback answer" } }],
    });
  };

  await generateContentWithAiProvider("first", "provider test");
  await generateContentWithAiProvider("second", "provider test");

  assert.equal(authCalls, 1);
});

test("preserves the GigaChat failure details when all providers fail", async () => {
  configureDirectProviders();
  global.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl.includes("deepseek")) {
      return jsonResponse({ error: "unavailable" }, 503);
    }
    return jsonResponse({ code: "AUTH_401", error: "invalid credentials" }, 401);
  };

  await assert.rejects(
    generateContentWithAiProvider("hello", "provider test"),
    (error) =>
      isProviderError(error) &&
      error.code === "AI_PROVIDERS_UNAVAILABLE" &&
      isProviderError(error.cause) &&
      error.cause.code === "AI_PROVIDER_REQUEST_REJECTED" &&
      error.cause.provider === "gigachat" &&
      error.cause.operation === "oauth" &&
      error.cause.providerCode === "AUTH_401" &&
      error.cause.status === 401
  );
});
