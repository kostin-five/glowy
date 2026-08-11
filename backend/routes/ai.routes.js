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

  return { message, hubMode, messages, currentEnergy };
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
  try {
    const { message, hubMode, messages, currentEnergy } = getMindHubRequestPayload(req.body);
    const validationError = buildValidationError(message, hubMode);

    if (validationError) {
      return res.status(400).json({ error: validationError });
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
      return res.status(429).json({
        error: "Лимит запросов исчерпан.",
        limit: aiLimitPreview.limit,
      });
    }

    if (hubMode === "chat") {
      try {
        const reply = await getCoachReply(message, messages);
        const aiLimit = await consumeAuthenticatedAiRequest(req.user.id);

        if (!aiLimit.allowed) {
          return res.status(429).json({
            error: "Лимит запросов исчерпан.",
            limit: aiLimit.limit,
          });
        }

        return res.json({ drafts: [], reply, limit: aiLimit.limit });
      } catch (error) {
        logger.error("ai.mind_hub.chat_failed", {
          req,
          error,
          statusCode: error?.status || 500,
        });

        if (isExpectedAiUnavailableError(error)) {
          return res.json(
            buildGracefulMindHubUnavailablePayload(error, {
              limit: aiLimitPreview.limit,
            })
          );
        }

        const { status: errStatus, body } = getMindHubErrorResponse(error);
        return res.status(errStatus).json(body);
      }
    }

    const today = formatDateDDMMYYYY(new Date());
    const parsedResult = await parseMindHubDrafts(
      message,
      today,
      activeTasks,
      effectiveCurrentEnergy,
      messages
    );
    const isExplicitNewRequest =
      /ещ[её]\s+(одну|раз)|новую|добавь\s+ещ[её]|на\s+(завтра|послезавтра|другую дату)/i.test(
        message
      );
    const duplicates = parsedResult.drafts.filter((draft) =>
      isDuplicateTask(draft, activeTasks)
    );
    const drafts = isExplicitNewRequest
      ? parsedResult.drafts
      : parsedResult.drafts.filter(
          (draft) => !isDuplicateTask(draft, activeTasks)
        );
    const aiLimit = await consumeAuthenticatedAiRequest(req.user.id);

    if (!aiLimit.allowed) {
      return res.status(429).json({
        error: "Лимит запросов исчерпан.",
        limit: aiLimit.limit,
      });
    }

    const duplicateReply =
      drafts.length === 0 && duplicates.length > 0
        ? `Такая задача уже есть: «${duplicates[0].title}».`
        : null;

    return res.json({
      drafts,
      reply:
        duplicateReply ||
        ensureMixedInputReply(message, drafts, parsedResult.reply) ||
        "Я рядом. Можешь продолжить мысль, и мы спокойно разберём её вместе.",
      limit: aiLimit.limit,
    });
  } catch (error) {
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
