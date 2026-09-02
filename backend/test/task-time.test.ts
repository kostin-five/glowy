import assert from "node:assert/strict";
import test from "node:test";
import { isAcceptableCompletionDate } from "../routes/task.routes.js";
import { normalizeOptionalMinutes } from "../utils/validation.utils.js";

test("task minutes stay optional and are capped at one day", () => {
  assert.deepEqual(normalizeOptionalMinutes(undefined), {
    valid: true,
    value: undefined,
  });
  assert.deepEqual(normalizeOptionalMinutes(null), { valid: true, value: null });
  assert.deepEqual(normalizeOptionalMinutes(60), { valid: true, value: 60 });
  assert.equal(normalizeOptionalMinutes(0).valid, false);
  assert.equal(normalizeOptionalMinutes(1441).valid, false);
  assert.equal(normalizeOptionalMinutes(2.5).valid, false);
});

test("completion date accepts local timezone rollover but rejects later dates", () => {
  const now = new Date("2026-08-16T20:00:00Z");
  assert.equal(isAcceptableCompletionDate("2026-08-16", now), true);
  assert.equal(isAcceptableCompletionDate("2026-08-17", now), true);
  assert.equal(isAcceptableCompletionDate("2026-08-18", now), false);
  assert.equal(isAcceptableCompletionDate("16.08.2026", now), false);
});
