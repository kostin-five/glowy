import express from "express";
import pg from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { authMiddleware } from "../middleware/auth.middleware.js";

const { PrismaClient } = pkg;
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.use(authMiddleware);

router.post("/analyze", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
    });

    const activeTasks = tasks.filter((task) => !task.completed);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    const energyLimit = user?.energyLimit ?? 100;

    if (!activeTasks.length) {
      return res.json({
        message:
          "На сегодня активных задач нет! Отличный повод восполнить свой энергопотенциал и отдохнуть. Наберись сил перед новыми целями! ✨",
      });
    }
    const tasksString = activeTasks
      .map(
        (task) =>
          `- ${task.title} (Энергия: ${task.energyLevel}, Приоритет: ${task.priority})`
      )
      .join("\n");
    const SYSTEM_PROMPT = `Ты — Glowy, эмпатичный ИИ-ассистент и наставник по личной продуктивности. 
    Твоя главная цель — помочь пользователю выполнить задачи на день, не доведя его до выгорания.

    ТЕКУЩИЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
    - Выбранный лимит энергии на сегодня: ${energyLimit}% (где 100% — режим терминатора или максимум энергии, а 0% — полное истощение).
    - Список его активных(невыполненных) задач на сегодня:
    ${tasksString}

    ЗАДАНИЕ:
    Проанализируй этот список. Сопоставь сложность задач с его лимитом энергии на сегодня (${energyLimit}%).
    Дай один короткий, глубокий, теплый и практичный совет (максимум 2-3 предложения) о том, как ему лучше распределить силы, с какой задачи начать с точки зрения энергозатратности, или как уберечь себя от перегрузки.
    
    ВАЖНО:
    1. Пиши связным, вдохновляющим текстом.
    2. Никаких списков, маркеров, форматирования по пунктам или жирного шрифта.
    3. Обращайся к пользователю на "ты", будь его понимающим другом.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(SYSTEM_PROMPT);
    const responseText = result.response.text();

    res.json({ message: responseText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Glowy сейчас отдыхает, попробуй позже" });
  }
});

export default router;
