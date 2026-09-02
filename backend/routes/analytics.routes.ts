import express from "express";
import type { Request } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { generateContentWithAiProvider } from "../services/ai/ai-provider.service.js";
import {
  releaseAuthenticatedAiRequest,
  reserveAuthenticatedAiRequest,
} from "../services/ai/ai-limits.service.js";
import {
  buildAnalyticsInsightPrompt,
  loadAnalyticsSnapshot,
} from "../services/analytics/analytics.service.js";
import type { AnalyticsKind } from "../services/analytics/analytics.service.js";
import type { AiReservation } from "../services/ai/ai-limits.service.js";
import { isDateOnly } from "../utils/validation.utils.js";
import { isUnknownRecord } from "../types/boundaries.js";

const validatePeriod = (
  kind: unknown,
  anchor: unknown
): kind is AnalyticsKind =>
  (kind === "week" || kind === "month") && isDateOnly(anchor);

const getInsightCost = (kind: AnalyticsKind): number =>
  kind === "month" ? 10 : 5;

const getErrorStatus = (error: unknown): number | undefined =>
  isUnknownRecord(error) && typeof error.status === "number"
    ? error.status
    : undefined;

export const createAnalyticsRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  loadSnapshot = loadAnalyticsSnapshot,
  reserveRequest = reserveAuthenticatedAiRequest,
  releaseRequest = releaseAuthenticatedAiRequest,
  generateInsight = generateContentWithAiProvider,
} = {}) => {
  const router = express.Router();
  const releaseReservation = async (
    req: Request,
    reservation: AiReservation | null | undefined
  ) => {
    if (!reservation) return;

    try {
      await releaseRequest(reservation);
    } catch (error) {
      logger.error("analytics.ai_limit.release_failed", {
        req,
        error,
        statusCode: 500,
        errorCode: "AI_LIMIT_RELEASE_FAILED",
      });
    }
  };
  router.use(authenticate);

  router.get("/", async (req, res) => {
    const kind = typeof req.query.period === "string" ? req.query.period : "";
    const anchor = typeof req.query.anchor === "string" ? req.query.anchor : "";
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
    let reservation = null;
    const body = isUnknownRecord(req.body) ? req.body : {};
    const kind = body.period;
    const anchor = body.anchor;
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
        anchor: anchor as string,
      });
      if (!snapshot.canUseFocusFeatures) {
        return res.status(403).json({ error: "AI-вывод доступен в Focus и Forever" });
      }
      if (!snapshot.hasActivity) {
        return res.status(422).json({
          error: "Для AI-вывода нужна хотя бы одна выполненная задача за период",
        });
      }

      const insightCost = getInsightCost(kind);
      const reserved = await reserveRequest(req.user.id, insightCost);
      if (!reserved.allowed) {
        return res.status(429).json({
          error: `Для этого разбора нужно ${insightCost} AI-запросов. Проверь оставшийся лимит.`,
          limit: reserved.limit,
        });
      }
      reservation = reserved.reservation;

      const user = await db.user.findUnique({
        where: { id: req.user.id },
        select: { aiTone: true },
      });
      const { text } = await generateInsight(
        buildAnalyticsInsightPrompt(snapshot, user?.aiTone),
        "Analytics insight",
        { userId: req.user.id }
      );

      return res.json({ insight: text, usage: reserved.limit, cost: insightCost });
    } catch (error) {
      await releaseReservation(req, reservation);
      logger.error("analytics.insight.failed", {
        req,
        error,
        statusCode: getErrorStatus(error) || 500,
      });
      return res.status(getErrorStatus(error) || 503).json({
        error: "Glowy не смог подготовить вывод. Попробуй немного позже.",
      });
    }
  });

  return router;
};

export default createAnalyticsRouter();
