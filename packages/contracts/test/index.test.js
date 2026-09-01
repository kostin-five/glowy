import assert from "node:assert/strict";
import test from "node:test";
import { CONTRACTS_VERSION } from "../dist/index.js";

test("exports the current contracts version", () => {
  assert.equal(CONTRACTS_VERSION, "2.9.0");
});
