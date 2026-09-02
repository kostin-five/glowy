import express from "express";
import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { parsePositiveId, isDateOnly } from "../utils/validation.utils.js";
import {
  releaseAuthenticatedAiRequest,
  reserveAuthenticatedAiRequest,
} from "../services/ai/ai-limits.service.js";
import { generateNoteTaskDraft } from "../services/ai/note-task-draft.service.js";
import {
  buildGracefulMindHubUnavailablePayload,
  getMindHubErrorResponse,
  isExpectedAiUnavailableError,
} from "../utils/ai-errors.utils.js";
import type { AiReservation } from "../services/ai/ai-limits.service.js";
import { isUnknownRecord } from "../types/boundaries.js";

const noteInclude = {
  taskLinks: {
    include: {
      task: { select: { id: true, title: true, completed: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.NoteInclude;

interface NormalizedNoteInput {
  title?: string;
  content?: string;
  archived?: boolean;
}

type NoteInputResult =
  | { error: string; data?: never }
  | { data: NormalizedNoteInput; error?: never };

const normalizeNoteInput = (
  bodyValue: unknown,
  partial = false
): NoteInputResult => {
  const body = isUnknownRecord(bodyValue) ? bodyValue : {};
  const result: NormalizedNoteInput = {};
  if (!partial || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || body.title.length > 200) {
      return { error: "Заголовок заметки должен быть не длиннее 200 символов" };
    }
    result.title = body.title.trim();
  }
  if (!partial || Object.hasOwn(body, "content")) {
    if (typeof body.content !== "string" || body.content.length > 50000) {
      return { error: "Текст заметки должен быть не длиннее 50 000 символов" };
    }
    result.content = body.content;
  }
  if (Object.hasOwn(body, "archived")) {
    if (typeof body.archived !== "boolean") {
      return { error: "Некорректное состояние архива" };
    }
    result.archived = body.archived;
  }
  return { data: result };
};

export const createNotesRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  generateDraft = generateNoteTaskDraft,
  reserveAiRequest = reserveAuthenticatedAiRequest,
  releaseAiRequest = releaseAuthenticatedAiRequest,
} = {}) => {
const router = express.Router();
const releaseReservation = async (
  req: Request,
  reservation: AiReservation | null | undefined
) => {
  if (!reservation) return;

  try {
    await releaseAiRequest(reservation);
  } catch (error) {
    logger.error("notes.ai_limit.release_failed", {
      req,
      error,
      statusCode: 500,
      errorCode: "AI_LIMIT_RELEASE_FAILED",
    });
  }
};
router.use(authenticate);

const getOwnedNote = (id: number, userId: number) =>
  db.note.findFirst({ where: { id, userId }, include: noteInclude });

router.get("/", async (req, res) => {
  try {
    const archived = req.query.archived === "true";
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    if (query.length > 200) return res.status(400).json({ error: "Поисковый запрос слишком длинный" });
    const notes = await db.note.findMany({
      where: {
        userId: req.user.id,
        archived,
        ...(query
          ? { OR: [
              { title: { contains: query, mode: "insensitive" } },
              { content: { contains: query, mode: "insensitive" } },
            ] }
          : {}),
      },
      include: noteInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 500,
    });
    return res.json(notes);
  } catch (error) {
    logger.error("notes.list.failed", { req, error, statusCode: 500 });
    return res.status(500).json({ error: "Не удалось загрузить заметки" });
  }
});

router.post("/", async (req, res) => {
  try {
    const normalized = normalizeNoteInput(req.body);
    if ("error" in normalized) {
      return res.status(400).json({ error: normalized.error });
    }
    if (!normalized.data.title && !(normalized.data.content ?? "").trim()) {
      return res.status(400).json({ error: "Добавьте заголовок или текст заметки" });
    }
    const note = await db.note.create({
      data: { ...normalized.data, userId: req.user.id },
      include: noteInclude,
    });
    return res.status(201).json(note);
  } catch (error) {
    logger.error("notes.create.failed", { req, error, statusCode: 500 });
    return res.status(500).json({ error: "Не удалось сохранить заметку" });
  }
});

router.get("/:id", async (req, res) => {
  const noteId = parsePositiveId(req.params.id);
  if (!noteId) return res.status(400).json({ error: "Некорректный ID заметки" });
  const note = await getOwnedNote(noteId, req.user.id);
  return note ? res.json(note) : res.status(404).json({ error: "Заметка не найдена" });
});

router.put("/:id", async (req, res) => {
  try {
    const noteId = parsePositiveId(req.params.id);
    if (!noteId) return res.status(400).json({ error: "Некорректный ID заметки" });
    const existing = await db.note.findFirst({ where: { id: noteId, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Заметка не найдена" });
    const normalized = normalizeNoteInput(req.body, true);
    if ("error" in normalized) {
      return res.status(400).json({ error: normalized.error });
    }
    const nextTitle = normalized.data.title ?? existing.title;
    const nextContent = normalized.data.content ?? existing.content;
    if (!nextTitle && !nextContent.trim()) {
      return res.status(400).json({ error: "Добавьте заголовок или текст заметки" });
    }
    const note = await db.note.update({
      where: { id: noteId }, data: normalized.data, include: noteInclude,
    });
    return res.json(note);
  } catch (error) {
    logger.error("notes.update.failed", { req, error, statusCode: 500 });
    return res.status(500).json({ error: "Не удалось сохранить заметку" });
  }
});

router.post("/:id/task-links", async (req, res) => {
  const noteId = parsePositiveId(req.params.id);
  const taskId = parsePositiveId(req.body?.taskId);
  if (!noteId || !taskId) return res.status(400).json({ error: "Некорректная связь" });
  const [note, task] = await Promise.all([
    db.note.findFirst({ where: { id: noteId, userId: req.user.id }, select: { id: true } }),
    db.task.findFirst({ where: { id: taskId, userId: req.user.id }, select: { id: true } }),
  ]);
  if (!note || !task) return res.status(404).json({ error: "Заметка или задача не найдена" });
  const link = await db.noteTaskLink.upsert({
    where: { noteId_taskId: { noteId, taskId } },
    create: { noteId, taskId }, update: {},
    include: { task: { select: { id: true, title: true, completed: true } } },
  });
  return res.status(201).json(link);
});

router.delete("/:id/task-links/:taskId", async (req, res) => {
  const noteId = parsePositiveId(req.params.id);
  const taskId = parsePositiveId(req.params.taskId);
  if (!noteId || !taskId) return res.status(400).json({ error: "Некорректная связь" });
  const note = await db.note.findFirst({ where: { id: noteId, userId: req.user.id }, select: { id: true } });
  if (!note) return res.status(404).json({ error: "Заметка не найдена" });
  await db.noteTaskLink.deleteMany({ where: { noteId, taskId } });
  return res.json({ message: "Связь удалена" });
});

router.post("/:id/task-draft", async (req, res) => {
  let reservation = null;
  try {
    const noteId = parsePositiveId(req.params.id);
    const fragment = typeof req.body?.fragment === "string" ? req.body.fragment.trim() : "";
    if (!noteId || !fragment || fragment.length > 4000) {
      return res.status(400).json({ error: "Выберите фрагмент от 1 до 4 000 символов" });
    }
    const note = await db.note.findFirst({ where: { id: noteId, userId: req.user.id }, select: { id: true, content: true } });
    if (!note) return res.status(404).json({ error: "Заметка не найдена" });
    if (!note.content.includes(fragment)) {
      return res.status(400).json({ error: "Сначала сохраните выбранный фрагмент заметки" });
    }
    const reserved = await reserveAiRequest(req.user.id);
    if (!reserved.allowed) return res.status(429).json({ error: "Лимит запросов исчерпан.", limit: reserved.limit });
    reservation = reserved.reservation;
    const draft = await generateDraft(fragment, { userId: req.user.id });
    return res.json({ draft, limit: reserved.limit });
  } catch (error) {
    await releaseReservation(req, reservation);
    logger.error("notes.task_draft.failed", {
      req,
      error,
      statusCode:
        isUnknownRecord(error) && typeof error.status === "number"
          ? error.status
          : 500,
    });
    if (isExpectedAiUnavailableError(error)) {
      const payload = buildGracefulMindHubUnavailablePayload(error);
      return res.status(503).json({ error: payload.reply, code: payload.code });
    }
    const { status, body } = getMindHubErrorResponse(error);
    return res.status(status).json(body);
  }
});

router.post("/:id/tasks", async (req, res) => {
  try {
    const noteId = parsePositiveId(req.params.id);
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const date = typeof req.body?.date === "string" ? req.body.date : "";
    const priority = ["🔥 P1", "⚡️ P2", "💤 P3"].includes(req.body?.priority) ? req.body.priority : "⚡️ P2";
    const energyLevel = ["low", "med", "high"].includes(req.body?.energyLevel) ? req.body.energyLevel : "med";
    const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
    if (!noteId || !title || title.length > 255 || category.length > 100 || (date && !isDateOnly(date))) {
      return res.status(400).json({ error: "Проверьте данные черновика задачи" });
    }
    const note = await db.note.findFirst({ where: { id: noteId, userId: req.user.id }, select: { id: true } });
    if (!note) return res.status(404).json({ error: "Заметка не найдена" });
    const result = await db.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: { title, date, priority, energyLevel, category, completed: false, userId: req.user.id },
        include: { subtasks: true },
      });
      const link = await tx.noteTaskLink.create({ data: { noteId, taskId: task.id } });
      return { task, link };
    });
    return res.status(201).json(result);
  } catch (error) {
    logger.error("notes.task_confirm.failed", { req, error, statusCode: 500 });
    return res.status(500).json({ error: "Не удалось создать задачу" });
  }
});

return router;
};

export default createNotesRouter();
