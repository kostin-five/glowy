import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pg from "pg";
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
    if (!tasks.length) {
      return res.json({
        message:
          "У тебя пока нет задач. Добавь первую, и я помогу тебе стартовать!",
      });
    }
    const tasksString = tasks
      .map(
        (task) =>
          `- ${task.title} (Энергия: ${task.energyLevel}, Приоритет: ${task.priority})`
      )
      .join("\n");
    const SYSTEM_PROMPT = `Ты — Glowy, эмпатичный ИИ-ассистент. 
    Твоя цель — помогать пользователю распределять силы и избегать выгорания. 
    Вот список задач пользователя на сегодня:
    ${tasksString}

    Проанализируй их уровень энергии и приоритет. 
    Дай один короткий, теплый и практичный совет (максимум 2-3 предложения) о том, с чего лучше начать или как распределить силы сегодня. 
    Пиши связным текстом, без списков.`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(SYSTEM_PROMPT);
    const responseText = result.response.text();
    res.json({ message: responseText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Glowy сейчас отдыхает, попробуй позже" });
  }
});

export default router;
