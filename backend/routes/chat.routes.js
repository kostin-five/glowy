import express from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

const limitter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: "Лимит AI исчерпан, отдохни" },
});

router.post("/", limitter, async (req, res) => {
  try {
    res.status(200).json({ message: "Запрос к ИИ прошел успешно!" });
  } catch (e) {
    logger.error("chat.request.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

export default router;
