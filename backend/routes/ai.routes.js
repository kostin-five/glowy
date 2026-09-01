import express from "express";
import {
  aiUsageSchema,
  mindHubRequestSchema,
  mindHubResponseSchema,
} from "@glowy/contracts";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { buildErrorEnvelope } from "../middleware/error.middleware.js";
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
  getAuthenticatedAiUsage,
  releaseAuthenticatedAiRequest,
  reserveAuthenticatedAiRequest,
} from "../services/ai/ai-limits.service.js";
import { formatDateDDMMYYYY } from "../utils/ai-date.utils.js";
import {
  buildGracefulMindHubUnavailablePayload,
  getMindHubErrorResponse,
  isExpectedAiUnavailableError,
} from "../utils/ai-errors.utils.js";

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

const buildAiError = (req, error, code, extra = {}) =>
  buildErrorEnvelope(req, error, code, extra);

const getSafeValidationDetails = (issues) =>
  issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
    code: issue.code,
  }));

const sendMindHubResponse = (req, res, payload) => {
  const result = mindHubResponseSchema.safeParse(payload);

  if (!result.success) {
    logger.error("ai.mind_hub.response_contract_failed", {
      req,
      error: new Error("Mind Hub response contract failed"),
      statusCode: 500,
      errorCode: "AI_RESPONSE_INVALID",
    });
    return res
      .status(500)
      .json(
        buildAiError(
          req,
          "Glowy не смог обработать сообщение. Попробуй отправить ещё раз.",
          "AI_RESPONSE_INVALID"
        )
      );
  }

  return res.json(result.data);
};

export const createAiRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  generateContent = generateContentWithAiProvider,
  coachReply = getCoachReply,
  parseDrafts = parseMindHubDrafts,
  getUsage = getAuthenticatedAiUsage,
  reserveRequest = reserveAuthenticatedAiRequest,
  releaseRequest = releaseAuthenticatedAiRequest,
} = {}) => {
const router = express.Router();
const releaseReservation = async (req, reservation) => {
  if (!reservation) return null;

  try {
    return await releaseRequest(reservation);
  } catch (error) {
    logger.error("ai.limit.release_failed", {
      req,
      error,
      statusCode: 500,
      errorCode: "AI_LIMIT_RELEASE_FAILED",
    });
    return null;
  }
};

router.use((req, _res, next) =>
  req.path === "/mind-hub/public" ? next("router") : next()
);
router.use(authenticate);

router.get("/usage", async (req, res) => {
  try {
    const usage = await getUsage(req.user.id);
    return res.json(aiUsageSchema.parse(usage));
  } catch (error) {
    logger.error("ai.usage.fetch_failed", { req, error, statusCode: 500 });

    return res
      .status(500)
      .json(
        buildAiError(
          req,
          "Не удалось загрузить статистику запросов к AI",
          "AI_USAGE_FAILED"
        )
      );
  }
});

router.post("/analyze", async (req, res) => {
  try {
    const tasks = await db.task.findMany({
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

    const user = await db.user.findUnique({
      where: { id: req.user.id },
    });
    const currentEnergy = user?.currentEnergy ?? 100;
    const tasksString = stringifyActiveTasks(activeTasks);
    const { text } = await generateContent(
      buildTaskAnalysisPrompt(tasksString, currentEnergy, user?.aiTone),
      "Task analysis",
      { userId: req.user.id }
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
  let reservation = null;
  let reservedLimit = null;
  try {
    const requestResult = mindHubRequestSchema.safeParse(req.body);

    if (!requestResult.success) {
      return res.status(400).json(
        buildAiError(
          req,
          "Проверь сообщение и параметры запроса.",
          "AI_REQUEST_INVALID",
          { details: getSafeValidationDetails(requestResult.error.issues) }
        )
      );
    }

    const { message, hubMode, messages, currentEnergy } = requestResult.data;

    const activeTasks = await db.task.findMany({
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
    const userEnergy = await db.user.findUnique({
      where: { id: req.user.id },
      select: { currentEnergy: true, aiTone: true },
    });
    const effectiveCurrentEnergy =
      typeof userEnergy?.currentEnergy === "number"
        ? userEnergy.currentEnergy
        : currentEnergy;
    const aiLimit = await reserveRequest(req.user.id);

    if (!aiLimit.allowed) {
      return res.status(429).json({
        error: "Лимит запросов исчерпан.",
        code: "AI_LIMIT_EXHAUSTED",
        requestId: req.requestId,
        limit: aiLimit.limit,
      });
    }
    reservation = aiLimit.reservation;
    reservedLimit = aiLimit.limit;

    if (hubMode === "chat") {
      try {
        const reply = await coachReply(
          message,
          messages,
          userEnergy?.aiTone,
          { userId: req.user.id }
        );
        return sendMindHubResponse(req, res, {
          drafts: [],
          reply,
          limit: reservedLimit,
        });
      } catch (error) {
        const released = await releaseReservation(req, reservation);
        reservation = null;
        logger.error("ai.mind_hub.chat_failed", {
          req,
          error,
          statusCode: error?.status || 500,
        });

        if (isExpectedAiUnavailableError(error)) {
          return sendMindHubResponse(
            req,
            res,
            buildGracefulMindHubUnavailablePayload(error, {
              limit: released?.limit ?? reservedLimit,
            })
          );
        }

        const { status: errStatus, body } = getMindHubErrorResponse(error);
        return res
          .status(errStatus)
          .json(
            buildAiError(
              req,
              body.error,
              "AI_PROVIDER_UNAVAILABLE",
              { retryable: Boolean(body.retryable) }
            )
          );
      }
    }

    const today = formatDateDDMMYYYY(new Date());
    const parsedResult = await parseDrafts(
      message,
      today,
      activeTasks,
      effectiveCurrentEnergy,
      messages,
      userEnergy?.aiTone,
      { userId: req.user.id }
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
    const duplicateReply =
      drafts.length === 0 && duplicates.length > 0
        ? `Такая задача уже есть: «${duplicates[0].title}».`
        : null;

    return sendMindHubResponse(req, res, {
      drafts,
      reply:
        duplicateReply ||
        ensureMixedInputReply(message, drafts, parsedResult.reply) ||
        "Я рядом. Можешь продолжить мысль, и мы спокойно разберём её вместе.",
      limit: reservedLimit,
    });
  } catch (error) {
    const released = await releaseReservation(req, reservation);
    reservation = null;
    logger.error("ai.mind_hub.failed", {
      req,
      error,
      statusCode: error?.status || 500,
    });

    if (isExpectedAiUnavailableError(error)) {
      return sendMindHubResponse(
        req,
        res,
        buildGracefulMindHubUnavailablePayload(error, {
          ...(released?.limit ? { limit: released.limit } : {}),
        })
      );
    }

    return res
      .status(500)
      .json(
        buildAiError(
          req,
          "Glowy не смог обработать сообщение. Попробуй отправить ещё раз.",
          "AI_REQUEST_FAILED"
        )
      );
  }
});

return router;
};

export default createAiRouter();
