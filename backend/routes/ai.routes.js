import express from "express";
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

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct:free",
          messages: [
            {
              role: "system",
              content:
                "Ты — эмпатичный ИИ-ассистент. Отвечай на русском языке кратко и по делу.",
            },
            { role: "user", content: SYSTEM_PROMPT },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `OpenRouter API Error: ${response.status} - ${errorData}`
      );
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    res.json({ message: responseText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Glowy сейчас отдыхает, попробуй позже" });
  }
});

export default router;
