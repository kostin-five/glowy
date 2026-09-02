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

interface AccountingContext {
  userId?: number | null;
}

interface ActiveTaskContext {
  id: number | string;
  title: string;
  date?: string | null;
  priority?: string | null;
  energyLevel?: string | null;
  category?: string | null;
}

interface ConversationMessage {
  role?: "user" | "assistant" | "model" | string;
  text?: string;
}

interface ComparableTask {
  title: string;
  date?: string | null;
}

interface TaskSubtask {
  title: string;
  completed: boolean;
}

interface TaskForAnalysis extends ActiveTaskContext {
  subtasks: TaskSubtask[];
}

interface NormalizedHistoryMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface NormalizedConversationMessage {
  role: "user" | "model";
  text: string;
}

const formatEnergyForPrompt = (energyLevel: unknown): string => {
  if (energyLevel === "high") return "высокая энергия";
  if (energyLevel === "low") return "низкая энергия";
  return "средняя энергия";
};

const formatPriorityForPrompt = (priority: string | null = ""): string => {
  priority ??= "";
  if (priority.includes("P1")) return "высокий приоритет";
  if (priority.includes("P3")) return "низкий приоритет";
  return "средний приоритет";
};

export const parseMindHubDrafts = async (
  message: string,
  today: string,
  activeTasksContext: ActiveTaskContext[] = [],
  currentEnergy: number | null = null,
  messages: ConversationMessage[] = [],
  aiTone = "calm",
  accountingContext?: AccountingContext | null
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
          return `${role}: ${item.text!.trim()}`;
        })
        .join("\n")
    : "";
  const conversationContext = conversationString
    ? `

ИСТОРИЯ ДИАЛОГА ДЛЯ КОНТЕКСТА:
${conversationString}`
    : "";
  const toneContext = `\n\nСТИЛЬ ОБЩЕНИЯ ПОЛЬЗОВАТЕЛЯ:\n${buildToneInstruction(aiTone)}`;
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
      `${conversationContext}${toneContext}`
    ),
    "Mind Hub parse",
    accountingContext
  );
  const parsedPayload = parseJsonLoose(responseText);

  return normalizeMindHubPayload(parsedPayload, today, message);
};

export const normalizeTaskTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,!?;:]/g, "")
    .trim();

export const isDuplicateTask = (
  task: ComparableTask,
  activeTasks: ComparableTask[]
): boolean => {
  const normalizedTitle = normalizeTaskTitle(task.title);
  return activeTasks.some((active) => {
    const activeNormalizedTitle = normalizeTaskTitle(active.title);
    const titleMatch = normalizedTitle === activeNormalizedTitle;
    const dateMatch = !task.date || !active.date || task.date === active.date;
    return titleMatch && dateMatch;
  });
};

const COACH_SYSTEM_INSTRUCTION =
  "Ты ИИ-наставник в приложении Glowy. Glowy — мужской персонаж, говори о себе в мужском роде. Твоя цель — помочь пользователю распутать мысли и выбрать следующее действие. Перед каждым ответом ОБЯЗАТЕЛЬНО анализируй доступную history: что пользователь уже спрашивал, какие ответы ты давал и какое состояние проявилось в диалоге. Каждый новый ответ должен быть уникальным, контекстным и не повторять предыдущие формулировки. Следуй выбранному режиму поведения ниже: он определяет степень поддержки, прямоты и требовательности. Отвечай живо и коротко: 1-2 предложения. Задавай максимум один вопрос, только если он помогает выбрать действие. НЕ используй шаблонные фразы и не повторяй fallback-текст. Не используй Markdown-разметку: никаких **жирных слов**, Markdown-заголовков, таблиц, цитат, code blocks или спецразметки. Обычные списки и нумерация разрешены, если они помогают ответить понятнее.";

const normalizeChatMessages = (
  messages: ConversationMessage[],
  currentMessage: string
): NormalizedHistoryMessage[] => {
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
    .filter(
      (message): message is NormalizedConversationMessage =>
        message.role !== null && message.text.length > 0
    )
    .filter(
      (message, index, list) =>
        !(
          index === list.length - 1 &&
          message.role === "user" &&
          message.text === currentMessage
        )
    )
    .slice(-10);

  const history: NormalizedHistoryMessage[] = [];

  for (const message of normalizedMessages) {
    if (!history.length && message.role !== "user") continue;

    const previousMessage = history.at(-1);
    if (previousMessage?.role === message.role) {
      previousMessage.parts[0]!.text += `\n${message.text}`;
      continue;
    }

    history.push({
      role: message.role,
      parts: [{ text: message.text }],
    });
  }

  return history;
};

export const buildToneInstruction = (aiTone = "calm") => {
  if (aiTone === "strict") {
    return "Говори жёстко, дисциплинированно и предельно прямо. Если действие не выполнено, прямо назови невыполнение, не принимай оправдание за результат и потребуй выбрать: выполнить конкретный шаг сейчас либо честно перепланировать задачу. Критикуй только действие и решение, никогда не личность. Не смягчай вывод нежными утешениями. Никогда не унижай, не стыди, не угрожай, не оскорбляй, не дискриминируй, не ставь диагнозы и не используй уязвимость пользователя.";
  }
  if (aiTone === "moderate") {
    return "Говори нейтрально и прямо: без утешений назови факт, отдели его от личности и предложи один конкретный следующий шаг. Не оправдывай бездействие, но не ругай, не дави и не критикуй пользователя.";
  }

  return "Говори мягко и бережно: признай состояние, поддержи пользователя и предложи реалистичный небольшой шаг без давления, обвинений и санкций.";
};

export const getCoachReply = async (
  message: string,
  messages: ConversationMessage[],
  aiTone = "calm",
  accountingContext?: AccountingContext | null
): Promise<string> => {
  const { text } = await chatWithAiProvider({
    message,
    history: normalizeChatMessages(messages, message),
    systemInstruction: `${COACH_SYSTEM_INSTRUCTION}\n\n${buildToneInstruction(aiTone)}`,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
    },
    contextLabel: "Mind Hub chat",
    accountingContext,
  });
  const reply = text.trim();

  if (!reply) {
    throw new Error("AI provider returned empty coach reply");
  }

  return reply;
};

export const buildTaskAnalysisPrompt = (
  tasksString: string,
  currentEnergy: number,
  aiTone = "calm"
) => `Ты — Glowy, эмпатичный ИИ-ассистент и наставник по личной продуктивности. Glowy — мужской персонаж: говори о себе только в мужском роде (например, "рад", "подготовил", "предложил"), никогда не используй женский род.
Твоя главная цель — помочь пользователю выполнить задачи на день, не доведя его до выгорания.

ВЫБРАННЫЙ СТИЛЬ ОБЩЕНИЯ:
${buildToneInstruction(aiTone)}

ТЕКУЩИЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Текущий ручной уровень энергии пользователя: ${currentEnergy}%.
- Список его активных задач на сегодня с подзадачами:
${tasksString}

ЗАДАНИЕ:
Проанализируй список, включая подзадачи. Сопоставь сложность задач с текущим уровнем энергии пользователя (${currentEnergy}%).
Дай один короткий, содержательный и практичный совет максимум в 2-3 предложения, строго соблюдая выбранный режим поведения.

ВАЖНО:
1. Пиши связным и понятным текстом; степень поддержки задаётся только выбранным режимом.
2. Никаких списков, маркеров, форматирования по пунктам или жирного шрифта.
3. Обращайся к пользователю на "ты" и оценивай только действия, а не личность.`;

export const stringifyActiveTasks = (tasks: TaskForAnalysis[]): string =>
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
