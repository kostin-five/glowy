import express from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { generateContentWithAiProvider } from "../services/ai/ai-provider.service.js";
import {
  buildTaskAnalysisPrompt,
  createMindHubTasks,
  getCoachReply,
  parseMindHubTasks,
  stringifyActiveTasks,
} from "../services/ai/mind-hub.service.js";
import { parseMindHubFallback } from "../services/ai/mind-hub-parser.service.js";
import {
  consumeAuthenticatedAiRequest,
  getAuthenticatedAiRequestLimit,
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
  max: 7,
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  message: {
    error:
      "Превышен лимит демо-запросов (7/7). Пожалуйста, зарегистрируйтесь для безлимитного доступа.",
  },
});

const EMOTIONAL_KEYWORDS = [
  "устал", "устала", "нет сил", "тяжело", "сложно", "тревожно", "тревога", 
  "плохо", "всё навалилось", "не понимаю", "не могу", "хаос", "выгорел", "выгорела"
];

const ensureMixedInputReply = (message, tasks, reply) => {
  if (reply) return reply;
  if (tasks.length === 0) return null;

  const text = message.toLowerCase();
  const hasEmotion = EMOTIONAL_KEYWORDS.some(keyword => text.includes(keyword));

  if (hasEmotion) {
    return "Понимаю, сил может быть мало. Я вынес конкретный шаг отдельно, чтобы начать было проще.";
  }

  return null;
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

  return { message, hubMode, messages };
};

const buildValidationError = (message, hubMode) => {
  if (!message) return "Сообщение не может быть пустым";
  if (!hubMode) return "Некорректный режим Хаба мыслей";

  return null;
};

router.post("/mind-hub/public", demoMindHubLimiter, async (req, res) => {
  let requestHubMode = "parse";

  try {
    const { message, hubMode, messages } = getMindHubRequestPayload(req.body);
    requestHubMode = hubMode;
    const validationError = buildValidationError(message, hubMode);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (hubMode === "chat") {
      const reply = await getCoachReply(message, messages);
      return res.json({ tasks: [], reply });
    }

    const today = formatDateDDMMYYYY(new Date());
    let parsedResult = null;

    try {
      parsedResult = await parseMindHubTasks(message, today);
    } catch (error) {
      if (isExpectedAiUnavailableError(error)) {
        console.error("Public Mind Hub AI unavailable", {
          code: error?.code,
          status: error?.status,
          hubMode: "parse",
        });
        return res.json(buildGracefulMindHubUnavailablePayload(error));
      }

      console.error("Public Mind Hub parsing failed, using fallback:", {
        code: error?.code,
        status: error?.status,
        hubMode: "parse",
      });
      parsedResult = {
        tasks: parseMindHubFallback(message, today),
        reply: null,
      };
    }

    const reply = ensureMixedInputReply(
      message,
      parsedResult.tasks,
      parsedResult.reply
    );

    return res.json({
      tasks: parsedResult.tasks,
      reply:
        reply ||
        (parsedResult.tasks.length
          ? null
          : "Не удалось выделить конкретные задачи."),
    });
  } catch (error) {
    const code = error?.code || "UNKNOWN_ERROR";
    const status = error?.status || 500;
    console.error("Public Mind Hub request failed", {
      code,
      status,
      hubMode: requestHubMode,
    });

    if (isExpectedAiUnavailableError(error)) {
      return res.json(buildGracefulMindHubUnavailablePayload(error));
    }

    const { status: errStatus, body } = getMindHubErrorResponse(error);
    return res.status(errStatus).json(body);
  }
});

router.use(authMiddleware);

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
    const code = error?.code || "UNKNOWN_ERROR";
    const status = error?.status || 500;
    console.error("AI analyze failed", {
      code,
      status,
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
  let requestHubMode = "parse";

  try {
    const { message, hubMode, messages } = getMindHubRequestPayload(req.body);
    requestHubMode = hubMode;
    const validationError = buildValidationError(message, hubMode);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const activeTasks = await prisma.task.findMany({
      where: { userId: req.user.id, completed: false },
      select: {
        title: true,
        date: true,
        priority: true,
        energyLevel: true,
        category: true,
      },
      take: 10,
    });
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

        return res.json({ tasks: [], reply, limit: aiLimit.limit });
      } catch (error) {
        const code = error?.code || "UNKNOWN_ERROR";
        const status = error?.status || 500;
        console.error("Mind Hub chat failed", {
          code,
          status,
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
    let parsedTasks = [];
    let reply = null;
    let parsedSuccessfully = false;

    try {
      const parsedResult = await parseMindHubTasks(message, today, activeTasks);
      parsedTasks = parsedResult.tasks;
      reply = parsedResult.reply;
      parsedSuccessfully = true;
    } catch (error) {
      if (isExpectedAiUnavailableError(error)) {
        console.error("Mind Hub AI unavailable", {
          code: error?.code,
          status: error?.status,
          hubMode: "parse",
        });
        return res.json(
          buildGracefulMindHubUnavailablePayload(error, {
            limit: aiLimitPreview.limit,
          })
        );
      }

      console.error("Mind Hub parsing failed, using fallback:", {
        code: error?.code,
        status: error?.status,
        hubMode: "parse",
      });
      parsedTasks = parseMindHubFallback(message, today);
    }

    if (!parsedTasks.length) {
      const aiLimit = parsedSuccessfully
        ? await consumeAuthenticatedAiRequest(req.user.id)
        : aiLimitPreview;

      if (!aiLimit.allowed) {
        return res.status(429).json({
          error: "Лимит запросов исчерпан.",
          limit: aiLimit.limit,
        });
      }

      return res.json({
        tasks: [],
        reply:
          reply ||
          "Я рядом. Похоже, сейчас здесь больше чувства, чем конкретные задачи. Можно просто выдохнуть и написать ещё немного.",
        limit: aiLimit.limit,
      });
    }

    const createdTasks = await createMindHubTasks(parsedTasks, req.user.id);
    const aiLimit = parsedSuccessfully
      ? await consumeAuthenticatedAiRequest(req.user.id)
      : aiLimitPreview;

    if (!aiLimit.allowed) {
      return res.status(429).json({
        error: "Лимит запросов исчерпан.",
        limit: aiLimit.limit,
      });
    }

    res.status(201).json({
      tasks: createdTasks,
      reply: ensureMixedInputReply(message, createdTasks, reply),
      limit: aiLimit.limit,
    });
  } catch (error) {
    const code = error?.code || "UNKNOWN_ERROR";
    const status = error?.status || 500;
    console.error("Mind Hub request failed", {
      code,
      status,
      hubMode: requestHubMode,
    });
    res.status(500).json({
      error: "Glowy не смог обработать сообщение. Попробуй отправить ещё раз.",
    });
  }
});

export default router;
