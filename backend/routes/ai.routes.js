import express from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { generateContentWithAiProvider } from "../services/ai/ai-provider.service.js";
import {
  buildTaskAnalysisPrompt,
  createMindHubTasks,
  getCoachReply,
  isDuplicateTask,
  parseMindHubTasks,
  stringifyActiveTasks,
} from "../services/ai/mind-hub.service.js";
import { parseMindHubFallback } from "../services/ai/mind-hub-parser.service.js";
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
  const rawCurrentEnergy = Number(body?.currentEnergy);
  const currentEnergy = Number.isFinite(rawCurrentEnergy)
    ? Math.min(100, Math.max(0, rawCurrentEnergy))
    : null;

  return { message, hubMode, messages, currentEnergy };
};

const buildValidationError = (message, hubMode) => {
  if (!message) return "Сообщение не может быть пустым";
  if (!hubMode) return "Некорректный режим Хаба мыслей";

  return null;
};

router.post("/mind-hub/public", demoMindHubLimiter, async (req, res) => {
  let requestHubMode = "parse";

  try {
    const { message, hubMode, messages, currentEnergy } = getMindHubRequestPayload(req.body);
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
      parsedResult = await parseMindHubTasks(
        message,
        today,
        [],
        currentEnergy,
        messages
      );
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

router.get("/usage", async (req, res) => {
  try {
    const usage = await getAuthenticatedAiUsage(req.user.id);
    return res.json(usage);
  } catch (error) {
    console.error("AI usage fetch failed", {
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.status || 500,
      message: error?.message,
    });

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
    const { message, hubMode, messages, currentEnergy } = getMindHubRequestPayload(req.body);
    requestHubMode = hubMode;
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
    let parsedActions = { updateTaskDate: [] };
    let reply = null;
    let parsedSuccessfully = false;

    try {
      const parsedResult = await parseMindHubTasks(
        message,
        today,
        activeTasks,
        effectiveCurrentEnergy,
        messages
      );
      parsedTasks = parsedResult.tasks;
      parsedActions = parsedResult.actions || { updateTaskDate: [] };
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

    const isExplicitNewRequest =
      /ещ[её]\s+(одну|раз)|новую|добавь\s+ещ[её]|на\s+(завтра|послезавтра|другую дату)/i.test(
        message
      );
    const looksLikeCreateRequest =
      !/перенеси|перенести|покажи|выпиши|с чего начать|что делать/i.test(
        message
      ) &&
      /надо|нужно|сделать|купить|ответить|подготовить|записаться|позвонить|сдать|убраться|добавь|создай|запиши/i.test(
        message
      );

    const updateTaskDateActions = parsedActions.updateTaskDate || [];
    const updatedTasks = [];

    for (const action of updateTaskDateActions) {
      const taskId = Number(action.taskId);
      const task = activeTasks.find((activeTask) => activeTask.id === taskId);

      if (!Number.isInteger(taskId) || !task) {
        continue;
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { date: action.date },
        include: {
          subtasks: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          },
        },
      });
      updatedTasks.push(updated);
    }

    if (updatedTasks.length > 0) {
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
        reply: reply || "Готово, обновил дату задачи.",
        actions: { updatedTasks },
        limit: aiLimit.limit,
      });
    }

    if (!parsedTasks.length && looksLikeCreateRequest) {
      parsedTasks = parseMindHubFallback(message, today);
      reply = null;
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

    const tasksToCreate = isExplicitNewRequest
      ? parsedTasks
      : parsedTasks.filter((task) => !isDuplicateTask(task, activeTasks));

    const duplicates = parsedTasks.filter((task) => isDuplicateTask(task, activeTasks));

    if (tasksToCreate.length === 0 && duplicates.length > 0) {
      return res.json({
        tasks: [],
        reply: `Такая задача уже есть: «${duplicates[0].title}».`,
        limit: aiLimitPreview.limit,
      });
    }

    const createdTasks = await createMindHubTasks(tasksToCreate, req.user.id);
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
