import express from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { generateContentWithAiProvider } from "../services/ai/ai-provider.service.js";
import {
  buildTaskAnalysisPrompt,
  getCoachReply,
  isDuplicateTask,
  parseMindHubDrafts,
  stringifyActiveTasks,
} from "../services/ai/mind-hub.service.js";
import {
  consumeAuthenticatedAiRequest,
  getAuthenticatedAiRequestLimit,
  getAuthenticatedAiUsage,
} from "../services/ai/ai-limits.service.js";
import { formatDateDDMMYYYY } from "../utils/ai-date.utils.js";
import {
  buildGracefulMindHubUnavailablePayload,
  getMindHubErrorResponse,
  isExpectedAiUnavailableError,
} from "../utils/ai-errors.utils.js";
import {
  AiHistoryValidationError,
  normalizeClientRequestId,
  normalizeHistoryQuery,
  normalizeMindHubMessage,
} from "../services/ai/ai-history.validation.js";
import {
  buildMindHubResponseWithHistory,
  clearHistory,
  discardPendingExchange,
  getRecentContext,
  listHistory,
  reserveExchange,
  serializeExchange,
} from "../services/ai/ai-history.service.js";

const router = express.Router();

const demoMindHubLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  message: {
    error:
      "Превышен лимит демо-запросов (3/3). Пожалуйста, зарегистрируйтесь, чтобы получить больше запросов.",
  },
});

const EMOTIONAL_KEYWORDS = [
  "устал", "устала", "нет сил", "тяжело", "сложно", "тревожно", "тревога", 
  "плохо", "всё навалилось", "не понимаю", "не могу", "хаос", "выгорел", "выгорела"
];

const ensureMixedInputReply = (message, drafts, reply) => {
  if (reply) return reply;
  if (drafts.length === 0) return null;

  const text = message.toLowerCase();
  const hasEmotion = EMOTIONAL_KEYWORDS.some(keyword => text.includes(keyword));

  if (hasEmotion) {
    return "Понимаю, сил может быть мало. Я вынес конкретный шаг отдельно, чтобы начать было проще.";
  }

  return "Я подготовил черновик. Проверь и отредактируй его перед сохранением.";
};

const getMindHubRequestPayload = (body) => {
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const hubMode =
    body?.hubMode === "chat" ||
    body?.hubMode === "parse" ||
    body?.hubMode === "auto"
      ? body.hubMode
      : "auto";
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const rawCurrentEnergy = Number(body?.currentEnergy);
  const currentEnergy = Number.isFinite(rawCurrentEnergy)
    ? Math.min(100, Math.max(0, rawCurrentEnergy))
    : null;

  const clientRequestId = body?.clientRequestId;

  return { message, hubMode, messages, currentEnergy, clientRequestId };
};

const buildValidationError = (message, hubMode) => {
  if (!message) return "Сообщение не может быть пустым";
  if (!hubMode) return "Некорректный режим Разгрузки мыслей";

  return null;
};

router.post("/mind-hub/public", demoMindHubLimiter, async (req, res) => {
  try {
    const { message, hubMode, messages, currentEnergy } = getMindHubRequestPayload(req.body);
    const validationError = buildValidationError(message, hubMode);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (hubMode === "chat") {
      const reply = await getCoachReply(message, messages);
      return res.json({ drafts: [], reply });
    }

    const today = formatDateDDMMYYYY(new Date());
    const parsedResult = await parseMindHubDrafts(
      message,
      today,
      [],
      currentEnergy,
      messages
    );

    const reply = ensureMixedInputReply(
      message,
      parsedResult.drafts,
      parsedResult.reply
    );

    return res.json({
      drafts: parsedResult.drafts,
      reply:
        reply ||
        "Я рядом. Можешь продолжить мысль, и мы спокойно разберём её вместе.",
    });
  } catch (error) {
    logger.error("ai.public_mind_hub.failed", {
      req,
      error,
      statusCode: error?.status || 500,
    });

    if (isExpectedAiUnavailableError(error)) {
      return res.json(buildGracefulMindHubUnavailablePayload(error));
    }

    const { status: errStatus, body } = getMindHubErrorResponse(error);
    return res.status(errStatus).json(body);
  }
});

router.use(authMiddleware);

router.get("/usage", async (req, res) => {
  try {
    const usage = await getAuthenticatedAiUsage(req.user.id);
    return res.json(usage);
  } catch (error) {
    logger.error("ai.usage.fetch_failed", { req, error, statusCode: 500 });

    return res.status(500).json({ error: "Не удалось загрузить AI usage" });
  }
});

const sendHistoryError = (res, error) => {
  if (error instanceof AiHistoryValidationError) {
    return res.status(400).json({ error: error.message });
  }
  return null;
};

const discardHistoryReservation = async (exchange, req) => {
  if (!exchange) return;
  try {
    await discardPendingExchange(exchange.id);
  } catch (error) {
    logger.error("ai.mind_hub.cleanup_failed", {
      req,
      error,
      statusCode: 500,
    });
  }
};

router.get("/mind-hub/history", async (req, res) => {
  try {
    const query = normalizeHistoryQuery(req.query);
    return res.json(await listHistory({ userId: req.user.id, ...query }));
  } catch (error) {
    if (sendHistoryError(res, error)) return;
    logger.error("ai.mind_hub.history_failed", { req, error, statusCode: 500 });
    return res.status(503).json({
      error: "Синхронизация истории временно недоступна",
      historyUnavailable: true,
    });
  }
});

router.delete("/mind-hub/history", async (req, res) => {
  try {
    await clearHistory(req.user.id);
    return res.status(204).send();
  } catch (error) {
    logger.error("ai.mind_hub.history_delete_failed", { req, error, statusCode: 500 });
    return res.status(500).json({ error: "Не удалось очистить историю" });
  }
});

router.post("/analyze", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      include: {
        subtasks: true,
      },
    });
    const activeTasks = tasks.filter((task) => !task.completed);

    if (!activeTasks.length) {
      return res.json({
        message:
          "На сегодня активных задач нет! Отличный повод восполнить свой энергопотенциал и отдохнуть. Наберись сил перед новыми целями! ✨",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    const currentEnergy = user?.currentEnergy ?? 100;
    const tasksString = stringifyActiveTasks(activeTasks);
    const { text } = await generateContentWithAiProvider(
      buildTaskAnalysisPrompt(tasksString, currentEnergy),
      "Task analysis"
    );

    res.json({ message: text });
  } catch (error) {
    logger.error("ai.analysis.failed", {
      req,
      error,
      statusCode: error?.status || 500,
    });

    if (isExpectedAiUnavailableError(error)) {
      const payload = buildGracefulMindHubUnavailablePayload(error);
      return res.json({
        message: payload.reply,
        aiUnavailable: true,
        retryable: payload.retryable,
        code: payload.code,
      });
    }

    const { status: errStatus, body } = getMindHubErrorResponse(error);
    res.status(errStatus).json({
      error:
        body.error ||
        "Glowy сейчас не смог подготовить совет. Попробуй немного позже.",
    });
  }
});

router.post("/mind-hub", async (req, res) => {
  let reservedExchange = null;
  try {
    const { message: rawMessage, hubMode, messages, currentEnergy, clientRequestId: rawClientRequestId } = getMindHubRequestPayload(req.body);
    const message = normalizeMindHubMessage(rawMessage);
    const validationError = buildValidationError(message, hubMode);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    let historySynced = false;
    try {
      const clientRequestId = normalizeClientRequestId(rawClientRequestId);
      const reservation = await reserveExchange({ userId: req.user.id, clientRequestId, userText: message });
      reservedExchange = reservation.isNew ? reservation.exchange : null;
      if (!reservation.isNew) {
        if (reservation.exchange.status === "completed") {
          const exchange = serializeExchange(reservation.exchange);
          return res.json({ exchange, drafts: [], reply: exchange.assistantMessage.text, historySynced: true });
        }
        return res.status(409).json({ error: "Этот запрос уже обрабатывается. Подожди немного." });
      }
    } catch (historyError) {
      logger.error("ai.mind_hub.history_reserve_failed", { req, error: historyError, statusCode: 503 });
    }

    const activeTasks = await prisma.task.findMany({
      where: { userId: req.user.id, completed: false },
      select: {
        id: true,
        title: true,
        date: true,
        priority: true,
        energyLevel: true,
        category: true,
        userId: true,
        completed: true,
      },
      take: 10,
    });
    const userEnergy = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { currentEnergy: true },
    });
    const effectiveCurrentEnergy =
      typeof userEnergy?.currentEnergy === "number"
        ? userEnergy.currentEnergy
        : currentEnergy;
    const aiLimitPreview = await getAuthenticatedAiRequestLimit(req.user.id);

    if (!aiLimitPreview.allowed) {
      await discardHistoryReservation(reservedExchange, req);
      reservedExchange = null;
      return res.status(429).json({
        error: "Лимит запросов исчерпан.",
        limit: aiLimitPreview.limit,
      });
    }

    let conversationMessages = messages;
    try {
      if (reservedExchange) conversationMessages = await getRecentContext(req.user.id);
    } catch (historyError) {
      logger.error("ai.mind_hub.history_context_failed", { req, error: historyError, statusCode: 503 });
    }

    let drafts = [];
    let reply = null;

    if (hubMode === "chat") {
      reply = await getCoachReply(message, conversationMessages);
    } else {
      const today = formatDateDDMMYYYY(new Date());
      const parsedResult = await parseMindHubDrafts(message, today, activeTasks, effectiveCurrentEnergy, conversationMessages);
      const isExplicitNewRequest = /ещ[её]\s+(одну|раз)|новую|добавь\s+ещ[её]|на\s+(завтра|послезавтра|другую дату)/i.test(message);
      const duplicates = parsedResult.drafts.filter((draft) => isDuplicateTask(draft, activeTasks));
      drafts = isExplicitNewRequest ? parsedResult.drafts : parsedResult.drafts.filter((draft) => !isDuplicateTask(draft, activeTasks));
      const duplicateReply = drafts.length === 0 && duplicates.length > 0 ? `Такая задача уже есть: «${duplicates[0].title}».` : null;
      reply = duplicateReply || ensureMixedInputReply(message, drafts, parsedResult.reply) || "Я рядом. Можешь продолжить мысль, и мы спокойно разберём её вместе.";
    }

    const aiLimit = await consumeAuthenticatedAiRequest(req.user.id);

    if (!aiLimit.allowed) {
      await discardHistoryReservation(reservedExchange, req);
      reservedExchange = null;
      return res.status(429).json({
        error: "Лимит запросов исчерпан.",
        limit: aiLimit.limit,
      });
    }

    const finalized = await buildMindHubResponseWithHistory({
      reservedExchange,
      drafts,
      reply,
      limit: aiLimit.limit,
    });
    historySynced = finalized.body.historySynced;
    if (finalized.historyError) {
      logger.error("ai.mind_hub.history_complete_failed", {
        req,
        error: finalized.historyError,
        statusCode: 503,
      });
      await discardHistoryReservation(reservedExchange, req);
    }
    reservedExchange = null;
    return res.json({ ...finalized.body, historySynced });
  } catch (error) {
    await discardHistoryReservation(reservedExchange, req);
    if (sendHistoryError(res, error)) return;
    logger.error("ai.mind_hub.failed", {
      req,
      error,
      statusCode: error?.status || 500,
    });

    if (isExpectedAiUnavailableError(error)) {
      return res.json(buildGracefulMindHubUnavailablePayload(error));
    }

    res.status(500).json({
      error: "Glowy не смог обработать сообщение. Попробуй отправить ещё раз.",
    });
  }
});

export default router;
