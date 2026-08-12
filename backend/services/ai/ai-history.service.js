import { prisma } from "../../lib/prisma.js";

export const serializeExchange = (exchange) => ({
  id: exchange.id,
  userMessage: { id: `${exchange.id}-user`, role: "user", text: exchange.userText },
  assistantMessage: { id: `${exchange.id}-assistant`, role: "assistant", text: exchange.assistantText || "" },
  createdAt: exchange.createdAt,
});

export const getOrCreateConversation = (userId, db = prisma) =>
  db.aiConversation.upsert({ where: { userId }, update: {}, create: { userId } });

export const reserveExchange = async ({ userId, clientRequestId, userText }, db = prisma) => {
  const conversation = await getOrCreateConversation(userId, db);
  const unique = { conversationId_clientRequestId: { conversationId: conversation.id, clientRequestId } };
  const existing = await db.aiExchange.findUnique({ where: unique });
  if (existing) return { exchange: existing, isNew: false };
  try {
    return {
      exchange: await db.aiExchange.create({ data: { conversationId: conversation.id, clientRequestId, userText } }),
      isNew: true,
    };
  } catch (error) {
    if (error?.code !== "P2002") throw error;
    return { exchange: await db.aiExchange.findUnique({ where: unique }), isNew: false };
  }
};

export const completeExchange = ({ exchangeId, assistantText }, db = prisma) =>
  db.aiExchange.update({
    where: { id: exchangeId },
    data: { status: "completed", assistantText, completedAt: new Date() },
  });

export const buildMindHubResponseWithHistory = async (
  { reservedExchange, drafts, reply, limit },
  complete = completeExchange
) => {
  if (!reservedExchange) {
    return {
      body: { drafts, reply, limit, historySynced: false },
      historyError: null,
    };
  }

  try {
    const exchange = serializeExchange(
      await complete({
        exchangeId: reservedExchange.id,
        assistantText: reply,
      })
    );
    return {
      body: { exchange, drafts, reply, limit, historySynced: true },
      historyError: null,
    };
  } catch (historyError) {
    return {
      body: { drafts, reply, limit, historySynced: false },
      historyError,
    };
  }
};

export const discardPendingExchange = (exchangeId, db = prisma) =>
  db.aiExchange.deleteMany({ where: { id: exchangeId, status: "pending" } });

export const listHistory = async ({ userId, cursor = null, limit = 20 }, db = prisma) => {
  const rows = await db.aiExchange.findMany({
    where: { conversation: { userId }, status: "completed", ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { id: "desc" },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page.at(-1)?.id ?? null : null;
  return { exchanges: page.reverse().map(serializeExchange), nextCursor, hasMore };
};

export const getRecentContext = async (userId, db = prisma) => {
  const rows = await db.aiExchange.findMany({
    where: { conversation: { userId }, status: "completed" },
    orderBy: { id: "desc" },
    take: 10,
    select: { userText: true, assistantText: true },
  });
  return rows.reverse().flatMap((row) => [
    { role: "user", text: row.userText },
    { role: "assistant", text: row.assistantText || "" },
  ]).filter((message) => message.text);
};

export const clearHistory = async (userId, db = prisma) => {
  const result = await db.aiConversation.deleteMany({ where: { userId } });
  return result.count > 0;
};
