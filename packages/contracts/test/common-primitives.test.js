import assert from "node:assert/strict";
import test from "node:test";
import {
  contractErrorSchema,
  dateOnlySchema,
  optionalTaskDateSchema,
  positiveIdParamSchema,
} from "../dist/index.js";

test("accepts safe common contract values", () => {
  assert.equal(positiveIdParamSchema.parse("42"), 42);
  assert.equal(dateOnlySchema.parse("2026-08-30"), "2026-08-30");
  assert.equal(optionalTaskDateSchema.parse(""), "");
  assert.equal(
    contractErrorSchema.parse({
      error: "Проверьте запрос",
      code: "INVALID_REQUEST",
      requestId: "018f07a2-7b6c-7d85-a2de-89efb6c124e1",
    }).code,
    "INVALID_REQUEST"
  );
});

test("rejects invalid calendar dates and unsafe error codes", () => {
  assert.equal(dateOnlySchema.safeParse("2026-02-30").success, false);
  assert.equal(
    contractErrorSchema.safeParse({
      error: "Ошибка",
      code: "contains private text",
      requestId: "018f07a2-7b6c-7d85-a2de-89efb6c124e1",
    }).success,
    false
  );
});
