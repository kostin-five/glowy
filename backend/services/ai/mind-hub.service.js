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

const formatEnergyForPrompt = (energyLevel) => {
  if (energyLevel === "high") return "высокая энергия";
  if (energyLevel === "low") return "низкая энергия";
  return "средняя энергия";
};

const formatPriorityForPrompt = (priority = "") => {
  if (priority.includes("P1")) return "высокий приоритет";
  if (priority.includes("P3")) return "низкий приоритет";
  return "средний приоритет";
};

export const parseMindHubDrafts = async (
  message,
  today,
  activeTasksContext = [],
  currentEnergy = null,
  messages = []
) => {
  const activeTasksString = activeTasksContext.length
    ? `

АКТИВНЫЕ ЗАДАЧИ ПОЛЬЗОВАТЕЛЯ ДЛЯ КОНТЕКСТА, ФОКУСА И ПРОВЕРКИ ДУБЛЕЙ:
${activeTasksContext
      .map(
        (t) =>
          `- id: ${t.id}; title: ${t.title}; date: ${
            t.date || "без даты"
          }; priority: ${formatPriorityForPrompt(
            t.priority
          )}; energy: ${formatEnergyForPrompt(t.energyLevel)}; category: ${
            t.category
          }`
    )
    .join("\n")}`
    : "";
  const userEnergyString =
    typeof currentEnergy === "number"
      ? `

ТЕКУЩИЙ ЭНЕРГОПОТЕНЦИАЛ ПОЛЬЗОВАТЕЛЯ: ${currentEnergy}%.
Используй его при советах "с чего начать", "как распределить день" и при выборе следующего шага:
- 0-30%: предлагай самый лёгкий старт, не дави и не советуй тяжёлые задачи как первый шаг.
- 31-70%: предлагай лёгкие или средние задачи, тяжёлые оставляй на потом.
- 71-100%: можно предлагать средние и тяжёлые задачи, если они важные.
Если отвечаешь советом, явно учитывай энергию пользователя простым языком.`
      : "";
  const conversationString = Array.isArray(messages)
    ? messages
        .filter(
          (item) =>
            (item?.role === "user" || item?.role === "assistant") &&
            typeof item?.text === "string" &&
            item.text.trim().length > 0
        )
        .slice(-8)
        .map((item) => {
          const role = item.role === "user" ? "Пользователь" : "Glowy";
          return `${role}: ${item.text.trim()}`;
        })
        .join("\n")
    : "";
  const conversationContext = conversationString
    ? `

ИСТОРИЯ ДИАЛОГА ДЛЯ КОНТЕКСТА:
${conversationString}`
    : "";
  const courseworkPlan = parseCourseworkPlan(message, today);

  if (courseworkPlan) {
    return courseworkPlan;
  }

  const { text: responseText } = await generateContentWithAiProvider(
    buildMindHubParsePrompt(
      message,
      today,
      activeTasksString,
      userEnergyString,
      conversationContext
    ),
    "Mind Hub parse"
  );
  const parsedPayload = parseJsonLoose(responseText);

  return normalizeMindHubPayload(parsedPayload, today, message);
};

export const normalizeTaskTitle = (title) =>
  title
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,!?;:]/g, "")
    .trim();

export const isDuplicateTask = (task, activeTasks) => {
  const normalizedTitle = normalizeTaskTitle(task.title);
  return activeTasks.some((active) => {
    const activeNormalizedTitle = normalizeTaskTitle(active.title);
    const titleMatch = normalizedTitle === activeNormalizedTitle;
    const dateMatch = !task.date || !active.date || task.date === active.date;
    return titleMatch && dateMatch;
  });
};

const COACH_SYSTEM_INSTRUCTION =
  "Ты эмпатичный ИИ-коуч в приложении Glowy. Glowy — мужской персонаж, говори о себе в мужском роде. Твоя цель — поддержать пользователя и помочь ему распутать мысли. Перед каждым ответом ОБЯЗАТЕЛЬНО анализируй всю доступную history: что пользователь уже спрашивал, какие ответы ты уже давал, какие эмоции и потребности проявились в диалоге. Каждый новый ответ должен быть уникальным, контекстным и не повторять предыдущие формулировки. Подстраивайся под состояние пользователя: усталость, тревогу, хаос, прокрастинацию, растерянность или запрос на совет. Отвечай живо, тепло и коротко: 1-2 предложения. Задавай максимум один наводящий вопрос, только если он действительно помогает продолжить диалог. НЕ используй шаблонные фразы и не повторяй fallback-текст. Не используй Markdown-разметку: никаких **жирных слов**, Markdown-заголовков, таблиц, цитат, code blocks или спецразметки. Обычные списки и нумерация разрешены, если они помогают ответить понятнее.";

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

      return `- ${task.title} (Энергия: ${formatEnergyForPrompt(
        task.energyLevel
      )}, Приоритет: ${formatPriorityForPrompt(
        task.priority
      )}, Подзадачи: ${subtasks})`;
    })
    .join("\n");
