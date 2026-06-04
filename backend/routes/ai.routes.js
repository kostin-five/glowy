import express from "express";
import pg from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middleware/auth.middleware.js";

const { PrismaClient } = pkg;
const { Pool } = pg;

// ---------------------------------------------------------------------------
// Инициализация роутера, Prisma и Gemini
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Общие константы и нормализация данных
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash";

const taskInclude = {
  subtasks: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
};

const priorityMap = {
  P1: "🔥 P1",
  P2: "⚡️ P2",
  P3: "💤 P3",
};

const normalizePriority = (priority = "P2") => {
  const value = typeof priority === "string" ? priority : "P2";

  if (value.includes("P1")) return priorityMap.P1;
  if (value.includes("P3")) return priorityMap.P3;
  return priorityMap.P2;
};

const normalizeEnergyLevel = (energyLevel = "med") => {
  const value = typeof energyLevel === "string" ? energyLevel : "med";

  if (["high", "med", "low"].includes(value)) return value;
  return "med";
};

const formatDateDDMMYYYY = (date) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const normalizeDate = (value, fallbackDate) => {
  const rawDate = typeof value === "string" ? value.trim() : "";

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
    return rawDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split("-");
    return `${day}.${month}.${year}`;
  }

  return fallbackDate;
};

// ---------------------------------------------------------------------------
// Валидация входящих запросов Mind Hub
// ---------------------------------------------------------------------------

const getMindHubRequestPayload = (body) => {
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const hubMode = body?.hubMode === "chat" ? "chat" : "parse";
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  return { message, hubMode, messages };
};

const buildValidationError = (message) =>
  message ? null : "Сообщение не может быть пустым";

// ---------------------------------------------------------------------------
// JSON helpers для parse-режима
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Логика парсинга задач: промпт, нормализация и сохранение в БД
// ---------------------------------------------------------------------------

const buildMindHubParsePrompt = (message, today) => `Ты — эксперт по планированию задач в приложении Glowy.
Твоя цель — преобразовать хаотичный текст пользователя в строгий JSON.

Сегодня: ${today}. Используй эту дату как точку отсчёта для слов "сегодня", "завтра", "в пятницу", "на выходных" и других относительных дат.

Верни один из двух форматов:
1. Если задачи есть:
{"tasks":[{"title":"...","date":"DD.MM.YYYY","priority":"P1|P2|P3","energyLevel":"high|med|low","category":"..."}],"reply":null}
2. Если задач нет:
{"tasks":[],"reply":"короткий эмпатичный ответ коуча"}

Правила атрибутов:
- date: всегда формат "DD.MM.YYYY". Если дата не указана, используй сегодняшнюю дату.
- category: определяй по контексту. Подходящие категории: "Здоровье", "Учеба", "Работа", "Быт", "Развитие".
- energyLevel: "high" для сложных и долгих задач вроде "написать курсовую"; "low" для простых вроде "купить хлеб"; "med" для обычных средних задач.
- priority: по умолчанию "P2"; срочные и важные задачи — "P1"; мелкие необязательные — "P3".
- Не придумывай лишние задачи.
- Не используй markdown, верни только валидный JSON.

Текст пользователя:
"""${message}"""`;

const normalizeMindHubPayload = (payload, fallbackDate) => {
  const rawTasks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.tasks)
    ? payload.tasks
    : [];

  const tasks = rawTasks
    .map((task) => ({
      title: typeof task.title === "string" ? task.title.trim() : "",
      date: normalizeDate(task.date, fallbackDate),
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

const inferFallbackCategory = (title) => {
  const value = title.toLowerCase();

  if (/врач|здоров|трениров|спорт|лекар|сон|психолог/.test(value)) {
    return "Здоровье";
  }

  if (/уч|экзамен|тест|препод|курс|диплом|курсов/.test(value)) {
    return "Учеба";
  }

  if (/работ|проект|презентац|созвон|клиент|отчет|отчёт/.test(value)) {
    return "Работа";
  }

  if (/книг|курс|навык|английск|развит/.test(value)) {
    return "Развитие";
  }

  return "Быт";
};

const inferFallbackEnergy = (title) => {
  const value = title.toLowerCase();

  if (/курсов|диплом|проект|переезд|ремонт|экзамен/.test(value)) {
    return "high";
  }

  if (/купить|забрать|ответить|позвонить|оплатить/.test(value)) {
    return "low";
  }

  return "med";
};

const parseMindHubFallback = (message, fallbackDate) =>
  message
    .split(/[\n,;]+|(?:\s+и\s+)/i)
    .map((title) => title.trim())
    .filter((title) => title.length > 0)
    .map((title) => ({
      title,
      date: fallbackDate,
      priority: priorityMap.P2,
      energyLevel: inferFallbackEnergy(title),
      category: inferFallbackCategory(title),
    }));

const parseMindHubTasks = async (message, today) => {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(
    buildMindHubParsePrompt(message, today)
  );
  const responseText = result.response.text();
  const parsedPayload = parseJsonLoose(responseText);

  return normalizeMindHubPayload(parsedPayload, today);
};

const createMindHubTasks = (tasks, userId) =>
  prisma.$transaction(
    tasks.map((task) =>
      prisma.task.create({
        data: {
          title: task.title,
          date: task.date,
          priority: task.priority,
          energyLevel: task.energyLevel,
          category: task.category,
          completed: false,
          userId,
        },
        include: taskInclude,
      })
    )
  );

// ---------------------------------------------------------------------------
// Логика эмпатичного коуча:
// - приводим историю фронтенда к формату Gemini;
// - запускаем model.startChat({ history }), чтобы ответы не повторялись;
// - отправляем текущее сообщение как живую реплику пользователя.
// ---------------------------------------------------------------------------

const COACH_SYSTEM_INSTRUCTION =
  "Ты эмпатичный ИИ-коуч в приложении Glowy. Твоя цель — поддержать пользователя и помочь ему распутать мысли. Отвечай каждый раз ПО-РАЗНОМУ, тепло, коротко (1-2 предложения) и задавай один наводящий вопрос. НЕ используй шаблонные фразы. Glowy — мужской персонаж, говори о себе в мужском роде.";

const normalizeChatMessages = (messages, currentMessage) => {
  const normalizedMessages = messages
    .map((message) => ({
      role:
        message?.role === "assistant" || message?.role === "model"
          ? "model"
          : message?.role === "user"
          ? "user"
          : null,
      text: typeof message?.text === "string" ? message.text.trim() : "",
    }))
    .filter((message) => message.role && message.text.length > 0)
    .filter(
      (message, index, list) =>
        !(
          index === list.length - 1 &&
          message.role === "user" &&
          message.text === currentMessage
        )
    )
    .slice(-10);

  const history = [];

  for (const message of normalizedMessages) {
    if (!history.length && message.role !== "user") continue;

    const previousMessage = history.at(-1);
    if (previousMessage?.role === message.role) {
      previousMessage.parts[0].text += `\n${message.text}`;
      continue;
    }

    history.push({
      role: message.role,
      parts: [{ text: message.text }],
    });
  }

  return history;
};

const getCoachFallbackReply = () =>
  "Я рядом. Давай не пытаться решить всё сразу: выбери один маленький следующий шаг и дай себе немного воздуха.";

const getCoachReply = async (message, messages) => {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.7 },
    systemInstruction: COACH_SYSTEM_INSTRUCTION,
  });
  const chat = model.startChat({
    history: normalizeChatMessages(messages, message),
  });
  const result = await chat.sendMessage(message);
  const reply = result.response.text().trim();

  return reply || getCoachFallbackReply();
};

// ---------------------------------------------------------------------------
// Эндпоинт аналитики: короткий совет по активным задачам и энергопотенциалу
// ---------------------------------------------------------------------------

const buildTaskAnalysisPrompt = (tasksString, energyLimit) => `Ты — Glowy, эмпатичный ИИ-ассистент и наставник по личной продуктивности. 
Твоя главная цель — помочь пользователю выполнить задачи на день, не доведя его до выгорания.

ТЕКУЩИЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Выбранный лимит энергии на сегодня: ${energyLimit}%.
- Список его активных задач на сегодня с подзадачами:
${tasksString}

ЗАДАНИЕ:
Проанализируй список, включая подзадачи. Сопоставь сложность задач с лимитом энергии на сегодня (${energyLimit}%).
Дай один короткий, глубокий, теплый и практичный совет максимум в 2-3 предложения.

ВАЖНО:
1. Пиши связным, вдохновляющим текстом.
2. Никаких списков, маркеров, форматирования по пунктам или жирного шрифта.
3. Обращайся к пользователю на "ты", будь его понимающим другом.`;

const stringifyActiveTasks = (tasks) =>
  tasks
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
    const energyLimit = user?.energyLimit ?? 100;
    const tasksString = stringifyActiveTasks(activeTasks);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(
      buildTaskAnalysisPrompt(tasksString, energyLimit)
    );

    res.json({ message: result.response.text() });
  } catch (error) {
    console.error("AI analyze failed:", error);
    res.status(500).json({
      error: "Glowy сейчас не смог подготовить совет. Попробуй немного позже.",
    });
  }
});

// ---------------------------------------------------------------------------
// Эндпоинт Mind Hub: два режима — chat и parse
// ---------------------------------------------------------------------------

router.post("/mind-hub", async (req, res) => {
  try {
    const { message, hubMode, messages } = getMindHubRequestPayload(req.body);
    const validationError = buildValidationError(message);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (hubMode === "chat") {
      try {
        const reply = await getCoachReply(message, messages);
        return res.json({ tasks: [], reply });
      } catch (error) {
        console.error("Mind Hub chat failed:", error);
        return res.json({
          tasks: [],
          reply: getCoachFallbackReply(),
        });
      }
    }

    const today = formatDateDDMMYYYY(new Date());
    let parsedTasks = [];
    let reply = null;

    try {
      const parsedResult = await parseMindHubTasks(message, today);
      parsedTasks = parsedResult.tasks;
      reply = parsedResult.reply;
    } catch (error) {
      console.error("Mind Hub parsing failed, using fallback:", error);
      parsedTasks = parseMindHubFallback(message, today);
    }

    if (!parsedTasks.length) {
      return res.json({
        tasks: [],
        reply:
          reply ||
          "Я рядом. Похоже, сейчас здесь больше чувства, чем конкретные задачи. Можно просто выдохнуть и написать ещё немного.",
      });
    }

    const createdTasks = await createMindHubTasks(parsedTasks, req.user.id);

    res.status(201).json({
      tasks: createdTasks,
      reply: null,
    });
  } catch (error) {
    console.error("Mind Hub request failed:", error);
    res.status(500).json({
      error: "Glowy не смог обработать сообщение. Попробуй отправить ещё раз.",
    });
  }
});

export default router;
