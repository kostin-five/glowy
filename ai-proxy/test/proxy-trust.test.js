import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const proxyAddr = require("proxy-addr");

test("IPv4-mapped IPv6 trust cannot be used to spoof an unrelated IPv4 client", () => {
  assert.equal(proxyAddr.compile("::ffff:10.0.0.0/8")("203.0.113.10"), false);
  const trust = proxyAddr.compile("::ffff:10.0.0.0/104");
  assert.equal(trust("10.1.2.3"), true);
  assert.equal(trust("203.0.113.10"), false);
});
