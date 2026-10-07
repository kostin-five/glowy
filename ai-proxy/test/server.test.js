import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

test("proxy health, auth, validation, timeout and burst are isolated from real providers", async () => {
  const upstream = createServer((_req, _res) => { /* Intentionally stalled local provider. */ });
  const allocator = createServer();
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  await new Promise((resolve) => allocator.listen(0, "127.0.0.1", resolve));
  const port = allocator.address().port;
  const providerPort = upstream.address().port;
  await new Promise((resolve) => allocator.close(resolve));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { NODE_ENV: "test", PORT: String(port), AI_PROXY_SECRET: "synthetic-proxy-secret", DEEPSEEK_API_KEY: "synthetic-provider-key", DEEPSEEK_MODEL: "test-model", DEEPSEEK_API_URL: `http://127.0.0.1:${providerPort}`, AI_PROVIDER_TIMEOUT_MS: "1000", DOTENV_CONFIG_PATH: "/nonexistent-synthetic-test-env" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  try {
    await Promise.race([once(child.stdout, "data"), once(child, "exit").then(() => { throw new Error("Proxy exited before test startup"); }), new Promise((_resolve, reject) => { const timeout = setTimeout(() => reject(new Error("Proxy startup timeout")), 5000); timeout.unref(); })]);
    const url = `http://127.0.0.1:${port}`;
    const send = (body, authorized = true) => fetch(`${url}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer synthetic-proxy-secret" } : {}) }, body });
    assert.equal((await fetch(`${url}/health`)).status, 200);
    assert.equal((await send("{}", false)).status, 401);
    const malformed = await send("{SENTINEL_TEXT");
    assert.equal(malformed.status, 400);
    assert.doesNotMatch(await malformed.text(), /SENTINEL/);
    assert.equal((await send(JSON.stringify({ messages: [{ role: "unknown", content: "SENTINEL_TEXT" }] }))).status, 400);
    const timeout = await send(JSON.stringify({ messages: [{ role: "user", content: "SENTINEL_TEXT" }] }));
    assert.equal(timeout.status, 503);
    assert.equal((await timeout.json()).error.code, "AI_PROVIDER_TIMEOUT");
    let limited = false;
    for (let i = 0; i < 61; i++) if ((await send("{}")).status === 429) { limited = true; break; }
    assert.equal(limited, true);
    assert.doesNotMatch(output, /synthetic-proxy-secret|synthetic-provider-key|SENTINEL_TEXT/);
  } finally {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
  }
});
