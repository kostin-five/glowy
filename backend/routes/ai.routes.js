import express from "express";
import pg from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { rateLimit } from "express-rate-limit";
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

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Лимит AI-запросов исчерпан. Попробуй немного позже." },
});

router.use(aiLimiter);

const taskInclude = {
  subtasks: true,
};

const MIND_HUB_SYSTEM_PROMPT =
  'Ты AI-коуч. Юзер пишет хаос из головы. Вычлени задачи и верни строгий JSON-массив: [{"title": "...", "priority": "P1|P2|P3", "energyLevel": "high|med|low", "category": "..."}]. Дата по умолчанию "сегодня", приоритет по умолчанию "P2", категория "Быт". Если задач нет, верни [] и добавь поле reply с эмпатичным ответом коуча.';

const priorityMap = {
  P1: "🔥 P1",
  P2: "⚡️ P2",
  P3: "💤 P3",
};

const normalizePriority = (priority = "P2") => {
  if (priority.includes("P1")) return priorityMap.P1;
  if (priority.includes("P3")) return priorityMap.P3;
  return priorityMap.P2;
};

const normalizeEnergyLevel = (energyLevel = "med") => {
  if (["high", "med", "low"].includes(energyLevel)) return energyLevel;
  return "med";
};

const stripJsonFence = (value) =>
  value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const parseJsonLoose = (value) => {
  const cleaned = stripJsonFence(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    }

    throw new Error("Gemini returned non-JSON mind hub response");
  }
};

const normalizeMindHubPayload = (payload) => {
  const rawTasks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.tasks)
    ? payload.tasks
    : [];

  const tasks = rawTasks
    .map((task) => ({
      title: typeof task.title === "string" ? task.title.trim() : "",
      priority: normalizePriority(task.priority),
      energyLevel: normalizeEnergyLevel(task.energyLevel),
      category:
        typeof task.category === "string" && task.category.trim()
          ? task.category.trim()
          : "Быт",
    }))
    .filter((task) => task.title.length > 0);

  const reply =
    !tasks.length && typeof payload?.reply === "string"
      ? payload.reply.trim()
      : null;

  return { tasks, reply };
};

router.post("/analyze", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      include: {
        subtasks: true,
      },
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
      .map((task) => {
        const subtasks = task.subtasks.length
          ? task.subtasks
              .map(
                (subtask) =>
                  `${subtask.completed ? "готово" : "активно"}: ${
                    subtask.title
                  }`
              )
              .join("; ")
          : "подзадач нет";

        return `- ${task.title} (Энергия: ${task.energyLevel}, Приоритет: ${task.priority}, Подзадачи: ${subtasks})`;
      })
      .join("\n");
    const SYSTEM_PROMPT = `Ты — Glowy, эмпатичный ИИ-ассистент и наставник по личной продуктивности. 
    Твоя главная цель — помочь пользователю выполнить задачи на день, не доведя его до выгорания.

    ТЕКУЩИЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
    - Выбранный лимит энергии на сегодня: ${energyLimit}% (где 100% — режим терминатора или максимум энергии, а 0% — полное истощение).
    - Список его активных(невыполненных) задач на сегодня с подзадачами:
    ${tasksString}

    ЗАДАНИЕ:
    Проанализируй этот список, включая подзадачи. Сопоставь сложность задач с его лимитом энергии на сегодня (${energyLimit}%).
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

router.post("/mind-hub", async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!message) {
      return res.status(400).json({ error: "Сообщение не может быть пустым" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`${MIND_HUB_SYSTEM_PROMPT}

Сегодня: ${today}.
Текст пользователя:
"""${message}"""

Верни только валидный JSON без markdown. Если задач нет, верни объект {"tasks":[],"reply":"..."} с короткой поддерживающей фразой.`);
    const responseText = result.response.text();
    const parsed = parseJsonLoose(responseText);
    const { tasks, reply } = normalizeMindHubPayload(parsed);

    if (!tasks.length) {
      return res.json({
        tasks: [],
        reply:
          reply ||
          "Я рядом. Похоже, сейчас здесь больше чувства, чем конкретные задачи. Можно просто выдохнуть и написать ещё немного.",
      });
    }

    const createdTasks = await prisma.$transaction(
      tasks.map((task) =>
        prisma.task.create({
          data: {
            title: task.title,
            energyLevel: task.energyLevel,
            category: task.category,
            date: today,
            priority: task.priority,
            completed: false,
            userId: req.user.id,
          },
          include: taskInclude,
        })
      )
    );

    res.status(201).json({
      tasks: createdTasks,
      reply: null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "Glowy не смог разобрать мысли. Попробуй отправить ещё раз.",
    });
  }
});

export default router;
