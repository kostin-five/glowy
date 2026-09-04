import assert from "node:assert/strict";
import test from "node:test";
import {
  aiLimitErrorSchema,
  aiUsageSchema,
  mindHubRequestSchema,
  mindHubResponseSchema,
  subtaskDraftRequestSchema,
  subtaskDraftResponseSchema,
} from "../dist/index.js";

const requestId = "018f07a2-7b6c-7d85-a2de-89efb6c124e1";

test("parses the current authenticated Mind Hub contract", () => {
  assert.equal(
    mindHubRequestSchema.parse({
      message: "Разобрать задачи",
      hubMode: "auto",
      messages: [{ role: "user", text: "Я устал" }],
      currentEnergy: 40,
    }).hubMode,
    "auto"
  );

  const response = mindHubResponseSchema.parse({
    drafts: [
      {
        title: "Ответить преподавателю",
        date: "31.08.2026",
        priority: "⚡️ P2",
        category: "Учёба",
        completed: false,
        energyLevel: "low",
        subtasks: [],
      },
    ],
    reply: "Я подготовил черновик.",
    limit: { limit: 10, remaining: 9, resetAt: "2026-08-31T12:00:00.000Z" },
  });

  assert.equal(response.drafts.length, 1);
  assert.equal(response.drafts[0].date, "2026-08-31");
});

test("parses bounded subtask drafts and rejects unsafe shapes", () => {
  const request = subtaskDraftRequestSchema.parse({
    title: "Подготовить запуск",
    existingSubtasks: ["Собрать обратную связь"],
  });
  assert.equal(request.energyLevel, "med");

  const response = subtaskDraftResponseSchema.parse({
    subtasks: [{ title: "Собрать требования" }, { title: "Проверить сценарий" }],
    limit: { limit: 70, remaining: 69, resetAt: null },
  });
  assert.equal(response.subtasks.length, 2);
  assert.equal(subtaskDraftResponseSchema.safeParse({ subtasks: [{ title: "Один шаг" }], limit: { limit: 70, remaining: 69, resetAt: null } }).success, false);
});

test("parses AI usage and graceful provider fallback", () => {
  assert.equal(
    aiUsageSchema.parse({ plan: "start", used: 1, limit: 10, remaining: 9 }).plan,
    "start"
  );

  assert.equal(
    mindHubResponseSchema.parse({
      drafts: [],
      reply: "Glowy сейчас отдыхает. Попробуй немного позже.",
      aiUnavailable: true,
      retryable: true,
      code: "AI_PROVIDER_TIMEOUT",
    }).aiUnavailable,
    true
  );

  assert.equal(
    aiLimitErrorSchema.parse({
      error: "Лимит запросов исчерпан.",
      code: "AI_LIMIT_EXHAUSTED",
      requestId,
      limit: { limit: 10, remaining: 0, resetAt: "2026-08-31T12:00:00.000Z" },
    }).requestId,
    requestId
  );
});

test("rejects invalid Mind Hub input and response dates", () => {
  assert.equal(mindHubRequestSchema.safeParse({ message: "   " }).success, false);
  assert.equal(
    mindHubResponseSchema.safeParse({
      drafts: [
        {
          title: "Задача",
          date: "31.02.2026",
          priority: "⚡️ P2",
          category: "Быт",
          energyLevel: "med",
          subtasks: [],
        },
      ],
      reply: null,
    }).success,
    false
  );
});
