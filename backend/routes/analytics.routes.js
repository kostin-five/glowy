import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { generateContentWithAiProvider } from "../services/ai/ai-provider.service.js";
import {
  consumeAuthenticatedAiRequest,
  getAuthenticatedAiRequestLimit,
} from "../services/ai/ai-limits.service.js";
import {
  buildAnalyticsInsightPrompt,
  loadAnalyticsSnapshot,
} from "../services/analytics/analytics.service.js";
import { isDateOnly } from "../utils/validation.utils.js";

const validatePeriod = (kind, anchor) =>
  ["week", "month"].includes(kind) && isDateOnly(anchor);

const getInsightCost = (kind) => (kind === "month" ? 10 : 5);

export const createAnalyticsRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  loadSnapshot = loadAnalyticsSnapshot,
  getRequestLimit = getAuthenticatedAiRequestLimit,
  generateInsight = generateContentWithAiProvider,
  consumeRequest = consumeAuthenticatedAiRequest,
} = {}) => {
  const router = express.Router();
  router.use(authenticate);

  router.get("/", async (req, res) => {
    const kind = req.query.period;
    const anchor = req.query.anchor;
    if (!validatePeriod(kind, anchor)) {
      return res.status(400).json({
        error: "Укажите period=week|month и anchor в формате YYYY-MM-DD",
      });
    }

    try {
      return res.json(
        await loadSnapshot({
          db,
          userId: req.user.id,
          kind,
          anchor,
        })
      );
    } catch (error) {
      logger.error("analytics.snapshot.failed", { req, error, statusCode: 500 });
      return res.status(500).json({ error: "Не удалось загрузить аналитику" });
    }
  });

  router.post("/insight", async (req, res) => {
    const kind = req.body?.period;
    const anchor = req.body?.anchor;
    if (!validatePeriod(kind, anchor)) {
      return res.status(400).json({
        error: "Укажите period=week|month и anchor в формате YYYY-MM-DD",
      });
    }

    try {
      const snapshot = await loadSnapshot({
        db,
        userId: req.user.id,
        kind,
        anchor,
      });
      if (!snapshot.canUseFocusFeatures) {
        return res.status(403).json({ error: "AI-вывод доступен в Focus и Founder" });
      }
      if (!snapshot.hasActivity) {
        return res.status(422).json({
          error: "Для AI-вывода нужна хотя бы одна выполненная задача за период",
        });
      }

      const insightCost = getInsightCost(kind);
      const limitPreview = await getRequestLimit(req.user.id, insightCost);
      if (!limitPreview.allowed) {
        return res.status(429).json({
          error: `Для этого разбора нужно ${insightCost} AI-запросов. Проверь оставшийся лимит.`,
          limit: limitPreview.limit,
        });
      }

      const user = await db.user.findUnique({
        where: { id: req.user.id },
        select: { aiTone: true },
      });
      const { text } = await generateInsight(
        buildAnalyticsInsightPrompt(snapshot, user?.aiTone),
        "Analytics insight",
        { userId: req.user.id }
      );
      const usage = await consumeRequest(req.user.id, insightCost);

      return res.json({ insight: text, usage: usage.limit, cost: insightCost });
    } catch (error) {
      logger.error("analytics.insight.failed", {
        req,
        error,
        statusCode: error?.status || 500,
      });
      return res.status(error?.status || 503).json({
        error: "Glowy не смог подготовить вывод. Попробуй немного позже.",
      });
    }
  });

  return router;
};

export default createAnalyticsRouter();
