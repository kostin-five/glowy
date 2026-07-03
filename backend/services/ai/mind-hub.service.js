import { prisma } from "../../lib/prisma.js";
import {
  chatWithAiProvider,
  generateContentWithAiProvider,
} from "./ai-provider.service.js";
import {
  buildMindHubParsePrompt,
  normalizeMindHubPayload,
  parseCourseworkPlan,
  parseJsonLoose,
} from "./mind-hub-parser.service.js";

const taskInclude = {
  subtasks: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
};

export const parseMindHubTasks = async (message, today) => {
  const courseworkPlan = parseCourseworkPlan(message, today);

  if (courseworkPlan) {
    return courseworkPlan;
  }

  const { text: responseText } = await generateContentWithAiProvider(
    buildMindHubParsePrompt(message, today),
    "Mind Hub parse"
  );
  const parsedPayload = parseJsonLoose(responseText);

  return normalizeMindHubPayload(parsedPayload, today, message);
};

export const createMindHubTasks = (tasks, userId) =>
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
          subtasks: task.subtasks?.length
            ? {
                create: task.subtasks,
              }
            : undefined,
        },
        include: taskInclude,
      })
    )
  );

const COACH_SYSTEM_INSTRUCTION =
  "Ты эмпатичный ИИ-коуч в приложении Glowy. Glowy — мужской персонаж, говори о себе в мужском роде. Твоя цель — поддержать пользователя и помочь ему распутать мысли. Перед каждым ответом ОБЯЗАТЕЛЬНО анализируй всю доступную history: что пользователь уже спрашивал, какие ответы ты уже давал, какие эмоции и потребности проявились в диалоге. Каждый новый ответ должен быть уникальным, контекстным и не повторять предыдущие формулировки. Подстраивайся под состояние пользователя: усталость, тревогу, хаос, прокрастинацию, растерянность или запрос на совет. Отвечай живо, тепло и коротко: 1-2 предложения. Задавай максимум один наводящий вопрос, только если он действительно помогает продолжить диалог. НЕ используй шаблонные фразы и не повторяй fallback-текст. Не используй Markdown и любое форматирование: никаких **жирных слов**, списков, нумерации, заголовков, bullet points, таблиц или спецразметки. Пиши только обычный гладкий текст.";

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

export const getCoachReply = async (message, messages) => {
  const { text } = await chatWithAiProvider({
    message,
    history: normalizeChatMessages(messages, message),
    systemInstruction: COACH_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
    },
    contextLabel: "Mind Hub chat",
  });
  const reply = text.trim();

  if (!reply) {
    throw new Error("Gemini returned empty coach reply");
  }

  return reply;
};

export const buildTaskAnalysisPrompt = (
  tasksString,
  currentEnergy
) => `Ты — Glowy, эмпатичный ИИ-ассистент и наставник по личной продуктивности. 
Твоя главная цель — помочь пользователю выполнить задачи на день, не доведя его до выгорания.

ТЕКУЩИЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Текущий ручной уровень энергии пользователя: ${currentEnergy}%.
- Список его активных задач на сегодня с подзадачами:
${tasksString}

ЗАДАНИЕ:
Проанализируй список, включая подзадачи. Сопоставь сложность задач с текущим уровнем энергии пользователя (${currentEnergy}%).
Дай один короткий, глубокий, теплый и практичный совет максимум в 2-3 предложения.

ВАЖНО:
1. Пиши связным, вдохновляющим текстом.
2. Никаких списков, маркеров, форматирования по пунктам или жирного шрифта.
3. Обращайся к пользователю на "ты", будь его понимающим другом.`;

export const stringifyActiveTasks = (tasks) =>
  tasks
    .map((task) => {
      const subtasks = task.subtasks.length
        ? task.subtasks
            .map(
              (subtask) =>
                `${subtask.completed ? "готово" : "активно"}: ${subtask.title}`
            )
            .join("; ")
        : "подзадач нет";

      return `- ${task.title} (Энергия: ${task.energyLevel}, Приоритет: ${task.priority}, Подзадачи: ${subtasks})`;
    })
    .join("\n");
