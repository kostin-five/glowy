import assert from "node:assert/strict";
import test from "node:test";
import { buildMindHubResponseWithHistory, clearHistory, completeExchange, discardPendingExchange, listHistory, reserveExchange } from "../services/ai/ai-history.service.js";

test("history pagination is owner-scoped and chronological", async () => {
  let query;
  const db = { aiExchange: { findMany: async (args) => { query = args; return [
    { id: 3, userText: "три", assistantText: "3", createdAt: new Date() },
    { id: 2, userText: "два", assistantText: "2", createdAt: new Date() },
  ]; } } };
  const page = await listHistory({ userId: 17, cursor: 4, limit: 1 }, db);
  assert.equal(query.where.conversation.userId, 17);
  assert.equal(page.exchanges[0].id, 3);
  assert.equal(page.hasMore, true);
});

test("exchange lifecycle reserves once and reuses duplicate request ID", async () => {
  let stored = null;
  const db = {
    aiConversation: { upsert: async () => ({ id: 3 }) },
    aiExchange: {
      findUnique: async () => stored,
      create: async ({ data }) => (stored = { id: 20, ...data, status: "pending", createdAt: new Date() }),
      update: async ({ data }) => (stored = { ...stored, ...data }),
    },
  };
  const first = await reserveExchange({ userId: 1, clientRequestId: "request-123", userText: "Привет" }, db);
  await completeExchange({ exchangeId: 20, assistantText: "Ответ" }, db);
  const duplicate = await reserveExchange({ userId: 1, clientRequestId: "request-123", userText: "Привет" }, db);
  assert.equal(first.isNew, true);
  assert.equal(duplicate.isNew, false);
  assert.equal(duplicate.exchange.assistantText, "Ответ");
});

test("failed cleanup and clear remain owner scoped", async () => {
  let pendingWhere;
  let ownerWhere;
  const db = {
    aiExchange: { deleteMany: async ({ where }) => { pendingWhere = where; return { count: 1 }; } },
    aiConversation: { deleteMany: async ({ where }) => { ownerWhere = where; return { count: 1 }; } },
  };
  await discardPendingExchange(91, db);
  await clearHistory(23, db);
  assert.deepEqual(pendingWhere, { id: 91, status: "pending" });
  assert.deepEqual(ownerWhere, { userId: 23 });
});

test("history completion failure preserves the ordinary AI response", async () => {
  const drafts = [{ title: "Сделать уроки" }];
  const result = await buildMindHubResponseWithHistory(
    {
      reservedExchange: { id: 41 },
      drafts,
      reply: "Подготовил черновик",
      limit: { remaining: 4 },
    },
    async () => {
      throw new Error("history unavailable");
    }
  );

  assert.equal(result.body.reply, "Подготовил черновик");
  assert.equal(result.body.drafts, drafts);
  assert.equal(result.body.historySynced, false);
  assert.equal(result.historyError?.message, "history unavailable");
});
