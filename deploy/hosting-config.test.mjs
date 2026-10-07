import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const blueprint = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("demo blueprint pins master without automatic deployment or migrations", () => {
  assert.match(blueprint, /^    branch: master$/m);
  assert.match(blueprint, /^    autoDeployTrigger: off$/m);
  assert.match(blueprint, /^    buildCommand: npm ci && npm --prefix backend ci && npm run build:backend$/m);
  assert.match(blueprint, /^    startCommand: npm --prefix backend run start:prod$/m);
  assert.match(blueprint, /^    healthCheckPath: \/api\/health$/m);
  assert.doesNotMatch(blueprint, /migrate:deploy|migrate reset|db push/);
});

test("demo defaults do not enable paid checkout or a sleeping background worker", () => {
  for (const flag of ["PAYMENTS_ENABLED", "TELEGRAM_WORKER_ENABLED", "REGISTRATION_ENABLED"]) {
    assert.match(blueprint, new RegExp(`- key: ${flag}\\n        value: "false"`));
  }
  assert.match(blueprint, /- key: DATABASE_URL\n        sync: false/);
  assert.match(blueprint, /- key: JWT_SECRET\n        generateValue: true/);
});

test("frontend enforces CSP without analytics scripts", () => {
  const headers = vercel.headers.find((rule) => rule.source === "/(.*)").headers;
  const csp = headers.find((header) => header.key === "Content-Security-Policy");
  assert.ok(csp);
  assert.ok(!headers.some((header) => header.key === "Content-Security-Policy-Report-Only"));
  assert.doesNotMatch(csp.value, /yandex|yastatic/);
  assert.match(csp.value, /script-src 'self' https:\/\/telegram.org;/);
  assert.match(csp.value, /worker-src 'self'/);
});

test("frontend API rewrite uses HTTPS and precedes SPA fallback", () => {
  const apiIndex = vercel.rewrites.findIndex((rule) => rule.source === "/api/:path*");
  const fallbackIndex = vercel.rewrites.findIndex((rule) => rule.destination === "/index.html");
  assert.ok(apiIndex >= 0 && fallbackIndex > apiIndex);
  const target = new URL(vercel.rewrites[apiIndex].destination);
  assert.equal(target.protocol, "https:");
  assert.equal(target.username, "");
  assert.equal(target.password, "");
});
