import assert from "node:assert/strict";
import test from "node:test";
import { InvalidSubtaskDraftError, normalizeSubtaskDraft } from "./subtask-draft.service.js";

test("normalizes, deduplicates and bounds generated subtask drafts", () => {
  const result = normalizeSubtaskDraft({ subtasks: [
    { title: "  Собрать требования  " },
    { title: "собрать требования" },
    "Проверить сценарий",
    { title: "Уже есть" },
  ] }, ["уже есть"]);
  assert.deepEqual(result, [{ title: "Собрать требования" }, { title: "Проверить сценарий" }]);
});

test("rejects drafts with fewer than two usable items", () => {
  assert.throws(() => normalizeSubtaskDraft({ subtasks: [{ title: "Один" }] }), InvalidSubtaskDraftError);
});
