import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMindHubParsePrompt,
  normalizeMindHubPayload,
} from "./mind-hub-parser.service.js";

test("normalizes a reply together with an unsaved task draft", () => {
  const result = normalizeMindHubPayload(
    {
      reply: "Я подготовил черновик. Проверь его перед сохранением.",
      drafts: [
        {
          id: 999,
          title: "  Подготовить доклад  ",
          date: "12.08.2026",
          priority: "P1",
          energyLevel: "high",
          category: " Учеба ",
          subtasks: [" Собрать источники ", { title: "Сделать слайды" }],
        },
      ],
    },
    "12.08.2026"
  );

  assert.equal(
    result.reply,
    "Я подготовил черновик. Проверь его перед сохранением."
  );
  assert.deepEqual(result.drafts, [
    {
      title: "Подготовить доклад",
      date: "12.08.2026",
      priority: "🔥 P1",
      energyLevel: "high",
      category: "Учеба",
      subtasks: [
        { title: "Собрать источники", completed: false, position: 0 },
        { title: "Сделать слайды", completed: false, position: 1 },
      ],
    },
  ]);
  assert.equal("id" in result.drafts[0], false);
});

test("returns reply-only output without inventing a draft", () => {
  const result = normalizeMindHubPayload(
    {
      reply: "Сначала дай себе немного выдохнуть.",
      drafts: [],
    },
    "12.08.2026"
  );

  assert.deepEqual(result, {
    drafts: [],
    reply: "Сначала дай себе немного выдохнуть.",
  });
});

test("drops malformed draft elements and empty steps", () => {
  const result = normalizeMindHubPayload(
    {
      reply: "Проверь предложение.",
      drafts: [null, {}, { title: "" }, { title: "Позвонить врачу", subtasks: ["", null] }],
    },
    "12.08.2026"
  );

  assert.equal(result.drafts.length, 1);
  assert.equal(result.drafts[0].title, "Позвонить врачу");
  assert.deepEqual(result.drafts[0].subtasks, []);
});

test("prompt defines drafts as proposals and forbids data mutation", () => {
  const prompt = buildMindHubParsePrompt("Как мне отдохнуть?", "12.08.2026");

  assert.match(prompt, /"drafts"/);
  assert.match(prompt, /говори о себе только в мужском роде/i);
  assert.match(prompt, /никогда не используй женский род/i);
  assert.match(prompt, /не создавай и не изменяй данные пользователя/i);
  assert.match(prompt, /явного подтверждения пользователя/i);
  assert.doesNotMatch(prompt, /"actions"/);
});
