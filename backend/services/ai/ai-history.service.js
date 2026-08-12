import { prisma } from "../../lib/prisma.js";
import { createTaskForUser } from "../tasks/task-create.service.js";
import { normalizeDraftPayload } from "./ai-history.validation.js";

export class AiHistoryConflictError extends Error {
  constructor(message, currentDraft = null) {
    super(message);
    this.name = "AiHistoryConflictError";
    this.currentDraft = currentDraft;
  }
}

export class AiHistoryNotFoundError extends Error {
  constructor(message = "Черновик не найден") {
    super(message);
    this.name = "AiHistoryNotFoundError";
  }
}

const draftInclude = { createdTask: { include: { subtasks: true } } };

const toIsoDate = (value) => {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value.trim();
};

export const serializeDraft = (draft) => ({
  id: draft.id,
  version: draft.version,
  status: draft.status,
  title: draft.title,
  date: draft.date,
  priority: draft.priority,
  energyLevel: draft.energyLevel,
  category: draft.category,
  completed: false,
  subtasks: Array.isArray(draft.subtasks) ? draft.subtasks : [],
  createdTaskId: draft.createdTaskId ?? null,
});

export const serializeExchange = (exchange) => ({
  id: exchange.id,
  userMessage: { id: `${exchange.id}-user`, role: "user", text: exchange.userText },
  assistantMessage: { id: `${exchange.id}-assistant`, role: "assistant", text: exchange.assistantText || "" },
  drafts: (exchange.drafts || []).filter((draft) => draft.status === "pending").map(serializeDraft),
  createdAt: exchange.createdAt,
});

const findOwnedDraft = async (db, userId, draftId, include = undefined) => {
  const draft = await db.aiTaskDraft.findFirst({
    where: { id: draftId, conversation: { userId } },
    ...(include ? { include } : {}),
  });
  if (!draft) throw new AiHistoryNotFoundError();
  return draft;
};

export const getOrCreateConversation = (userId, db = prisma) =>
  db.aiConversation.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

export const reserveExchange = async ({ userId, clientRequestId, userText }, db = prisma) => {
  const conversation = await getOrCreateConversation(userId, db);
  const existing = await db.aiExchange.findUnique({
    where: { conversationId_clientRequestId: { conversationId: conversation.id, clientRequestId } },
    include: { drafts: true },
  });
  if (existing) return { exchange: existing, isNew: false };

  try {
    const exchange = await db.aiExchange.create({
      data: { conversationId: conversation.id, clientRequestId, userText },
      include: { drafts: true },
    });
    return { exchange, isNew: true };
  } catch (error) {
    if (error?.code !== "P2002") throw error;
    const exchange = await db.aiExchange.findUnique({
      where: { conversationId_clientRequestId: { conversationId: conversation.id, clientRequestId } },
      include: { drafts: true },
    });
    return { exchange, isNew: false };
  }
};

export const completeExchange = async ({ exchangeId, assistantText, drafts }, db = prisma) => {
  const normalizedDrafts = drafts.slice(0, 5).map((draft) =>
    normalizeDraftPayload({ ...draft, date: toIsoDate(draft.date) })
  );
  return db.aiExchange.update({
    where: { id: exchangeId },
    data: {
      status: "completed",
      assistantText,
      completedAt: new Date(),
      drafts: normalizedDrafts.length ? { create: normalizedDrafts } : undefined,
    },
    include: { drafts: true },
  });
};

export const discardPendingExchange = (exchangeId, db = prisma) =>
  db.aiExchange.deleteMany({ where: { id: exchangeId, status: "pending" } });

export const listHistory = async ({ userId, cursor = null, limit = 20 }, db = prisma) => {
  const rows = await db.aiExchange.findMany({
    where: {
      conversation: { userId },
      status: "completed",
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit + 1,
    include: { drafts: { where: { status: "pending" }, orderBy: { id: "asc" } } },
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page.at(-1)?.id ?? null : null;
  return {
    exchanges: page.reverse().map(serializeExchange),
    nextCursor,
    hasMore,
  };
};

export const getRecentContext = async (userId, db = prisma) => {
  const exchanges = await db.aiExchange.findMany({
    where: { conversation: { userId }, status: "completed" },
    orderBy: { id: "desc" },
    take: 10,
    select: { userText: true, assistantText: true },
  });
  return exchanges.reverse().flatMap((exchange) => [
    { role: "user", text: exchange.userText },
    { role: "assistant", text: exchange.assistantText || "" },
  ]).filter((message) => message.text);
};

export const updateDraft = async ({ userId, draftId, payload }, db = prisma) => {
  const normalized = normalizeDraftPayload(payload, { requireVersion: true });
  await findOwnedDraft(db, userId, draftId);
  const { version, ...data } = normalized;
  const result = await db.aiTaskDraft.updateMany({
    where: { id: draftId, conversation: { userId }, status: "pending", version },
    data: { ...data, version: { increment: 1 } },
  });
  const current = await findOwnedDraft(db, userId, draftId);
  if (result.count !== 1) {
    throw new AiHistoryConflictError("Черновик изменился на другом устройстве", serializeDraft(current));
  }
  return serializeDraft(current);
};

export const dismissDraft = async ({ userId, draftId }, db = prisma) => {
  const current = await findOwnedDraft(db, userId, draftId);
  if (current.status === "dismissed") return serializeDraft(current);
  if (current.status !== "pending") throw new AiHistoryConflictError("Черновик уже обработан", serializeDraft(current));
  const updated = await db.aiTaskDraft.update({ where: { id: draftId }, data: { status: "dismissed" } });
  return serializeDraft(updated);
};

export const confirmDraft = async ({ userId, draftId, version }, db = prisma) =>
  db.$transaction(async (tx) => {
    const current = await findOwnedDraft(tx, userId, draftId, draftInclude);
    if (current.status === "confirmed" && current.createdTask) {
      return { draft: serializeDraft(current), task: current.createdTask };
    }
    if (current.status !== "pending" || current.version !== version) {
      throw new AiHistoryConflictError("Черновик изменился или уже обработан", serializeDraft(current));
    }
    const claimed = await tx.aiTaskDraft.updateMany({
      where: { id: draftId, conversation: { userId }, status: "pending", version },
      data: { status: "confirming" },
    });
    if (claimed.count !== 1) throw new AiHistoryConflictError("Черновик уже подтверждается");
    const task = await createTaskForUser(tx, userId, current);
    const confirmed = await tx.aiTaskDraft.update({
      where: { id: draftId },
      data: { status: "confirmed", createdTaskId: task.id },
    });
    return { draft: serializeDraft(confirmed), task };
  });

export const clearHistory = async (userId, db = prisma) => {
  const result = await db.aiConversation.deleteMany({ where: { userId } });
  return result.count > 0;
};
