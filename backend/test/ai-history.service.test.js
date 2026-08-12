import assert from "node:assert/strict";
import test from "node:test";
import { AiHistoryConflictError, clearHistory, completeExchange, confirmDraft, discardPendingExchange, dismissDraft, listHistory, reserveExchange, serializeExchange, updateDraft } from "../services/ai/ai-history.service.js";

const draft = { id: 8, version: 2, status: "pending", title: "Уроки", date: "2026-08-13", priority: "⚡️ P2", energyLevel: "med", category: "Учеба", subtasks: [], createdTaskId: null };

test("serializes only pending drafts without exposing owner data", () => {
  const result = serializeExchange({ id: 4, userText: "Вопрос", assistantText: "Ответ", createdAt: new Date(0), drafts: [draft, { ...draft, id: 9, status: "dismissed" }] });
  assert.equal(result.drafts.length, 1);
  assert.deepEqual(result.userMessage, { id: "4-user", role: "user", text: "Вопрос" });
  assert.equal("conversationId" in result, false);
});

test("history pagination is owner-scoped and chronological", async () => {
  let query;
  const db = { aiExchange: { findMany: async (args) => { query = args; return [
    { id: 3, userText: "три", assistantText: "3", drafts: [], createdAt: new Date() },
    { id: 2, userText: "два", assistantText: "2", drafts: [], createdAt: new Date() },
  ]; } } };
  const page = await listHistory({ userId: 17, cursor: 4, limit: 1 }, db);
  assert.equal(query.where.conversation.userId, 17);
  assert.deepEqual(query.where.id, { lt: 4 });
  assert.equal(page.exchanges[0].id, 3);
  assert.equal(page.hasMore, true);
  assert.equal(page.nextCursor, 3);
});

test("draft update rejects a stale version and returns current state", async () => {
  const db = { aiTaskDraft: {
    findFirst: async () => draft,
    updateMany: async () => ({ count: 0 }),
  } };
  await assert.rejects(() => updateDraft({ userId: 1, draftId: 8, payload: { ...draft, version: 1 } }, db), (error) => {
    assert.ok(error instanceof AiHistoryConflictError);
    assert.equal(error.currentDraft.version, 2);
    return true;
  });
});

test("clear history scopes deletion to authenticated owner", async () => {
  let where;
  const db = { aiConversation: { deleteMany: async (args) => { where = args.where; return { count: 1 }; } } };
  assert.equal(await clearHistory(23, db), true);
  assert.deepEqual(where, { userId: 23 });
});

test("repeated confirmation returns one created task", async () => {
  let current = { ...draft, conversation: { userId: 1 }, createdTask: null };
  let createCount = 0;
  const db = {
    $transaction: async (callback) => callback(db),
    aiTaskDraft: {
      findFirst: async ({ where }) => where.id === current.id && where.conversation.userId === 1 ? current : null,
      updateMany: async () => {
        if (current.status !== "pending") return { count: 0 };
        current = { ...current, status: "confirming" };
        return { count: 1 };
      },
      update: async ({ data }) => {
        current = { ...current, ...data, createdTask: data.createdTaskId ? { id: data.createdTaskId, title: current.title, subtasks: [] } : current.createdTask };
        return current;
      },
    },
    task: {
      create: async ({ data }) => {
        createCount += 1;
        return { id: 44, ...data, subtasks: [] };
      },
    },
  };

  const first = await confirmDraft({ userId: 1, draftId: 8, version: 2 }, db);
  const second = await confirmDraft({ userId: 1, draftId: 8, version: 2 }, db);
  assert.equal(first.task.id, 44);
  assert.equal(second.task.id, 44);
  assert.equal(createCount, 1);
});

test("dismissal is idempotent and never creates a task", async () => {
  let current = { ...draft };
  let updates = 0;
  const db = { aiTaskDraft: {
    findFirst: async () => current,
    update: async ({ data }) => { updates += 1; current = { ...current, ...data }; return current; },
  } };
  assert.equal((await dismissDraft({ userId: 1, draftId: 8 }, db)).status, "dismissed");
  assert.equal((await dismissDraft({ userId: 1, draftId: 8 }, db)).status, "dismissed");
  assert.equal(updates, 1);
});

test("exchange lifecycle reserves once, completes once and reuses duplicate request ID", async () => {
  let stored = null;
  const db = {
    aiConversation: { upsert: async () => ({ id: 3, userId: 1 }) },
    aiExchange: {
      findUnique: async () => stored,
      create: async ({ data }) => {
        stored = { id: 20, ...data, status: "pending", drafts: [], createdAt: new Date() };
        return stored;
      },
      update: async ({ data }) => {
        stored = {
          ...stored,
          status: data.status,
          assistantText: data.assistantText,
          completedAt: data.completedAt,
          drafts: (data.drafts?.create || []).map((item, index) => ({ id: index + 1, version: 1, status: "pending", ...item })),
        };
        return stored;
      },
    },
  };

  const first = await reserveExchange({ userId: 1, clientRequestId: "request-123", userText: "Сделать уроки" }, db);
  assert.equal(first.isNew, true);
  const completed = await completeExchange({ exchangeId: first.exchange.id, assistantText: "Подготовил черновик", drafts: [{ ...draft, date: "13.08.2026" }] }, db);
  const duplicate = await reserveExchange({ userId: 1, clientRequestId: "request-123", userText: "Сделать уроки" }, db);

  assert.equal(completed.status, "completed");
  assert.equal(completed.drafts[0].date, "2026-08-13");
  assert.equal(duplicate.isNew, false);
  assert.equal(duplicate.exchange.id, first.exchange.id);
});

test("failed exchange cleanup removes only a pending reservation", async () => {
  let where;
  const db = { aiExchange: { deleteMany: async (args) => { where = args.where; return { count: 1 }; } } };
  await discardPendingExchange(91, db);
  assert.deepEqual(where, { id: 91, status: "pending" });
});
