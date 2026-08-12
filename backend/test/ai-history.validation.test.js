import assert from "node:assert/strict";
import test from "node:test";
import { AiHistoryValidationError, normalizeClientRequestId, normalizeDraftPayload, normalizeHistoryQuery, normalizeMindHubMessage } from "../services/ai/ai-history.validation.js";

test("normalizes safe AI history request values", () => {
  assert.equal(normalizeClientRequestId(" request-123 "), "request-123");
  assert.equal(normalizeMindHubMessage(" Привет "), "Привет");
  assert.deepEqual(normalizeHistoryQuery({ cursor: "42", limit: "20" }), { cursor: 42, limit: 20 });
});

test("normalizes and validates an editable draft", () => {
  const draft = normalizeDraftPayload({ version: 2, title: " Сделать уроки ", date: "2026-08-13", priority: "⚡️ P2", energyLevel: "high", category: " Учеба ", subtasks: [{ title: " Математика " }, { title: " Русский " }] }, { requireVersion: true });
  assert.deepEqual(draft.subtasks, [{ title: "Математика", completed: false, position: 0 }, { title: "Русский", completed: false, position: 1 }]);
  assert.equal(draft.version, 2);
});

test("rejects values outside contract limits", () => {
  assert.throws(() => normalizeMindHubMessage(" "), AiHistoryValidationError);
  assert.throws(() => normalizeClientRequestId("bad id"), AiHistoryValidationError);
  assert.throws(() => normalizeHistoryQuery({ limit: 51 }), AiHistoryValidationError);
  assert.throws(() => normalizeDraftPayload({ title: "Задача", date: "13.08.2026", priority: "обычный", energyLevel: "med", category: "Быт" }), AiHistoryValidationError);
});
