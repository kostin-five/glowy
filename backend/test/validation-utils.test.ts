import assert from "node:assert/strict";
import test from "node:test";
import {
  addDaysToDateOnly,
  isDateOnly,
  normalizeOptionalMinutes,
  parsePositiveId,
} from "../utils/validation.utils.js";

test("validates date-only values without accepting overflow dates", () => {
  assert.equal(isDateOnly("2026-02-28"), true);
  assert.equal(isDateOnly("2026-02-30"), false);
  assert.equal(isDateOnly("28.02.2026"), false);
  assert.equal(addDaysToDateOnly("2026-12-31", 1), "2027-01-01");
});

test("validates positive identifiers and optional durations", () => {
  assert.equal(parsePositiveId("12"), 12);
  assert.equal(parsePositiveId("0"), null);
  assert.deepEqual(normalizeOptionalMinutes(null), { valid: true, value: null });
  assert.deepEqual(normalizeOptionalMinutes(60), { valid: true, value: 60 });
  assert.equal(normalizeOptionalMinutes(1441).valid, false);
});
