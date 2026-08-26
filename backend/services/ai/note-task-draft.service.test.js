import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNoteTaskDraft } from "./note-task-draft.service.js";

test("normalizes a note fragment result into an unsaved task draft", () => {
  assert.deepEqual(
    normalizeNoteTaskDraft({
      title: "  Позвонить врачу  ",
      date: "2026-08-27",
      priority: "🔥 P1",
      energyLevel: "low",
      category: " Здоровье ",
      unexpected: "must be ignored",
    }),
    {
      title: "Позвонить врачу",
      date: "2026-08-27",
      priority: "🔥 P1",
      energyLevel: "low",
      category: "Здоровье",
    }
  );
});

test("uses safe defaults and rejects an empty AI title", () => {
  assert.deepEqual(normalizeNoteTaskDraft({ title: "Сделать первый шаг" }), {
    title: "Сделать первый шаг",
    date: "",
    priority: "⚡️ P2",
    energyLevel: "med",
    category: "Личное",
  });
  assert.throws(() => normalizeNoteTaskDraft({ title: "   " }), /empty note task draft/);
});
