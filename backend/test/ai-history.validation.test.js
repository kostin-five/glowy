import assert from "node:assert/strict";
import test from "node:test";
import { AiHistoryValidationError, normalizeClientRequestId, normalizeHistoryQuery, normalizeMindHubMessage } from "../services/ai/ai-history.validation.js";

test("normalizes safe AI history request values", () => {
  assert.equal(normalizeClientRequestId(" request-123 "), "request-123");
  assert.equal(normalizeMindHubMessage(" Привет "), "Привет");
  assert.deepEqual(normalizeHistoryQuery({ cursor: "42", limit: "20" }), { cursor: 42, limit: 20 });
});

test("rejects values outside contract limits", () => {
  assert.throws(() => normalizeMindHubMessage(" "), AiHistoryValidationError);
  assert.throws(() => normalizeClientRequestId("bad id"), AiHistoryValidationError);
  assert.throws(() => normalizeHistoryQuery({ limit: 51 }), AiHistoryValidationError);
});
