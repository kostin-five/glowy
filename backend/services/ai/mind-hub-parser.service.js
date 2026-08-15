import {
  extractExactDateFromText,
  normalizeDate,
  stripExactDateFromTitle,
} from "../../utils/ai-date.utils.js";

export const priorityMap = {
  P1: "🔥 P1",
  P2: "⚡️ P2",
  P3: "💤 P3",
};

export const normalizePriority = (priority = "P2") => {
  const value = typeof priority === "string" ? priority : "P2";

  if (value.includes("P1")) return priorityMap.P1;
  if (value.includes("P3")) return priorityMap.P3;
  return priorityMap.P2;
};

export const normalizeEnergyLevel = (energyLevel = "med") => {
  const value = typeof energyLevel === "string" ? energyLevel : "med";

  if (["high", "med", "low"].includes(value)) return value;
  return "med";
};

export const stripJsonFence = (value) => {
  const trimmed = value.trim();
  const fencedJsonMatch = trimmed.match(/^```\s*(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fencedJsonMatch) {
    return fencedJsonMatch[1].trim();
  }

  return trimmed
    .replace(/^\s*```\s*(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*json\s*(?=[[{])/i, "")
    .trim();
};

export const parseJsonLoose = (value) => {
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

    throw new Error("AI provider returned non-JSON mind hub response");
  }
};

export const buildMindHubParsePrompt = (
  message,
  today,
  activeTasksContext = "",
  userEnergyContext = "",
  conversationContext = ""
) => `Ты — Glowy, эмпатичный ИИ-ассистент и спокойный помощник по задачам. Glowy — мужской персонаж: говори о себе только в мужском роде (например, "рад", "подготовил", "предложил"), никогда не используй женский род.${activeTasksContext}${userEnergyContext}${conversationContext}

Твоя цель — сначала спокойно ответить пользователю, а затем при необходимости предложить
редактируемый черновик. Верни только валидный JSON строгого формата:
{"drafts": [...], "reply": "..."}

Не создавай и не изменяй данные пользователя. Любой элемент drafts — только
предложение до явного подтверждения пользователя в интерфейсе.

Сегодня: ${today}. Используй эту дату только как точку отсчета для слов "сегодня", "завтра", "послезавтра", "через неделю" и похожих формулировок.

ПРАВИЛА НАМЕРЕНИЙ:
1. Если пользователь задаёт обычный вопрос, просит поддержку, совет, список задач, расстановку приоритетов, план дня или спрашивает "с чего начать", верни drafts: [] и короткий содержательный reply.
2. Если пользователь явно описывает конкретное новое дело, предложи его в drafts, но не говори, что задача уже создана или сохранена.
3. Если пользователь смешал эмоции и конкретные дела, сначала коротко поддержи в reply, а реальные дела предложи как drafts.
4. Если намерение неясно, не предлагай задачу наугад. Верни drafts: [] и один короткий уточняющий вопрос.
5. Анализируй смысл сообщения, а не отдельные ключевые слова.
6. Если пользователь отвечает коротким согласием вроде "да", "давай", "ок", "хорошо", "угу", "можно", "согласен", обязательно смотри ИСТОРИЮ ДИАЛОГА. Продолжи последнее предложение или вопрос ассистента. Не отвечай общим приветствием и не проси "напиши подробнее", если из истории понятно, на что пользователь согласился.

ЭНЕРГИЯ И ТОН:
1. Сначала учитывай оба сигнала: currentEnergy и настроение текста. Если пользователь пишет "я устал", "я вымотан", "нет сил", "я перегружен" или похожее, начинай мягко даже при высоком currentEnergy.
2. Если currentEnergy 0-25%, предлагай только отдых, самую лёгкую задачу или маленький шаг; не предлагай тяжёлые задачи как первый шаг.
3. Если currentEnergy 26-70%, предлагай лёгкие и средние задачи.
4. Если currentEnergy 71-100%, можно предлагать сложные и важные задачи, только если пользователь не звучит уставшим.
5. В обычном ответе не используй внутренние значения вроде high energy, med energy, low energy, P1, P2, P3. Для пользователя пиши простыми словами: "низкая энергия", "средняя энергия", "высокая энергия", "высокий приоритет".
6. Если пользователь просит изменить существующие данные, не обещай действие и верни drafts: []. Коротко объясни, что изменения существующих задач пока нужно сделать в списке задач.

РАБОТА С АКТИВНЫМИ ЗАДАЧАМИ:
1. Если пользователь просит показать, перечислить, оценить или выбрать задачи, используй АКТИВНЫЕ ЗАДАЧИ и верни drafts: [].
2. Если пользователь просит "выпиши мои активные задачи" или похожий список, верни максимум 7 задач коротким нумерованным списком.
3. Для каждого пункта пиши только: 1. Название — дата, приоритет, энергия.
4. Если задач больше 7, добавь последней строкой: "Показал первые 7, остальные можно посмотреть в списке задач."
5. Если пользователь спрашивает "с чего начать", предложи 1-2 существующие задачи с учетом текущего энергопотенциала и состояния усталости.
6. При низкой энергии сначала советуй отдых, low-energy задачу или самый маленький шаг. Не начинай с тяжёлой задачи как с первого шага.
7. При энергии 26-70% предлагай лёгкие и средние задачи.
8. При энергии 71-100% можно предлагать сложные и важные задачи, но если пользователь звучит уставшим, начинай мягче.
9. Не предлагай дубль, если новое дело по смыслу совпадает с активной задачей и относится к той же дате/контексту. В reply скажи, какая задача уже есть.
10. Если пользователь явно хочет отдельную новую копию, повтор, другую дату, другую категорию или другой смысл, можно предложить отдельный draft.
11. Не переноси даты и не выполняй другие изменения существующих задач. Для таких запросов верни drafts: [] и коротко направь пользователя в список задач.

ФОРМАТ REPLY:
Пиши обычный текст без Markdown-разметки. Нельзя использовать **жирный текст**, __подчёркивание__, Markdown-заголовки, таблицы, цитаты, code blocks или спецразметку.
- Для обычных ответов: максимум 2-3 предложения.
- Для "распредели день": максимум 4 коротких пункта.
- Для "выпиши мои активные задачи" и похожих запросов: максимум 7 активных задач, каждая с новой строки через обычную нумерацию.
  Формат: 1. Название — дата, приоритет, энергия.
  Если задач больше 7, добавь фразу: "Показал первые 7, остальные можно посмотреть в списке задач."
- Не используй служебные значения P1/P2/P3/high/med/low в reply.

Если пользователь просит список задач, верни drafts: [].
Если пользователь просит совет, верни drafts: [].
Если пользователь просит изменить существующую задачу, не обещай действие и верни drafts: [].

ВАЖНОЕ ПРАВИЛО ПОДЗАДАЧ (SUBTASKS):
Ты должен строго отличать независимые задачи от шагов, ведущих к одной цели.

Если пользователь описывает одну глобальную цель и перечисляет шаги для её достижения, предложи ТОЛЬКО ОДИН главный draft, а все шаги помести в массив subtasks в виде строк. Слова "сначала", "потом", "затем", "после этого" почти всегда означают последовательные шаги одной задачи, а не отдельные drafts.
ПРИМЕР ВХОДА: "Очень срочно нужно сделать курсач. Сначала собрать источники, потом написать введение."
ПРАВИЛЬНЫЙ ВЫХОД: Одна задача с title: "Сделать курсовую работу", subtasks: ["Собрать источники", "Написать введение"].
ПРИМЕР ВХОДА: "Очень срочно нужно сделать курсач по учебе, отнимет кучу сил. Сначала собрать источники, потом написать введение."
ПРАВИЛЬНЫЙ ВЫХОД: Одна задача с title: "Сделать курсовую работу", category: "Учеба", energyLevel: "high", priority: "P1", subtasks: ["Собрать источники", "Написать введение"].

Предлагай несколько независимых drafts ТОЛЬКО если дела абсолютно не связаны между собой контекстом.
ПРИМЕР ВХОДА: "Сделать курсач и сходить в магазин за молоком."
ПРАВИЛЬНЫЙ ВЫХОД: Две разные задачи ("Сделать курсовую работу" и "Купить молоко").

Правила атрибутов:
- date: всегда формат "DD.MM.YYYY". Если пользователь указал в тексте точную дату или день недели, ты ОБЯЗАН использовать именно её. Текущая дата передается тебе только как точка отсчета для слов "завтра" или "через неделю". Никогда не заменяй явно указанную дату на сегодняшнюю.
- Если в заголовке задачи есть дата вроде "08.06.2026", "8.06", "08/06/2026" или день недели, перенеси её в поле date и убери из title, если без неё заголовок остаётся понятным.
- Если дата вообще не указана, только тогда используй сегодняшнюю дату: ${today}.
- category: определяй по контексту. Подходящие категории: "Здоровье", "Учеба", "Работа", "Быт", "Развитие", "Спорт".
- Если пользователь явно указывает категорию, например пишет "Проект", "Дом", "Учеба", "Спорт", "Работа" и т.д., ты ОБЯЗАН использовать ровно это слово в поле category. Не заменяй его на синонимы и не придумывай свои категории.
- Физические упражнения и тренировки всегда относятся к категории "Спорт": бег, пробежка, подтягивания, зал, тренировка, спорт, фитнес, упражнения. Никогда не относись их к "Быт".
- Учебные задачи всегда относятся к категории "Учеба": отчет, отчёт, доклад, курсовая, CYVA, универ, экзамен, тест, преподаватель. Никогда не относись их к "Работа".
- energyLevel: "high" для сложных и долгих задач вроде "написать курсовую"; "low" для простых вроде "купить хлеб"; "med" для обычных средних задач.
- priority: по умолчанию "P2"; срочные и важные задачи — "P1"; мелкие необязательные — "P3".
- subtasks: всегда массив строк. Если подзадач нет, верни пустой массив [].
- Не придумывай лишние задачи.
- Всегда заполняй reply, даже когда drafts не пуст.
- Не используй Markdown-разметку нигде в JSON, включая поле reply. Верни только валидный JSON.

Текст пользователя:
"""${message}"""`;

const shouldMergeCourseworkSteps = (sourceMessage, tasks) => {
  const text = sourceMessage.toLowerCase();

  return (
    tasks.length > 1 &&
    /курс|курсов|курсач|диплом|реферат/.test(text) &&
    /сначала|потом|затем|после этого|далее/.test(text) &&
    tasks.every((task) => task.category.replace("ё", "е") === "Учеба")
  );
};

const mergeCourseworkSteps = (sourceMessage, tasks) => {
  if (!shouldMergeCourseworkSteps(sourceMessage, tasks)) return tasks;

  const [firstTask] = tasks;
  const subtasks = tasks
    .flatMap((task, taskIndex) => {
      const currentSubtasks = task.subtasks?.length
        ? task.subtasks
        : [
            {
              title: task.title,
              completed: false,
              position: taskIndex,
            },
          ];

      return currentSubtasks.map((subtask) => ({
        ...subtask,
        position: taskIndex,
      }));
    })
    .filter((subtask) => subtask.title.length > 0);

  return [
    {
      ...firstTask,
      title: "Сделать курсовую работу",
      category: "Учеба",
      priority: priorityMap.P1,
      energyLevel: "high",
      subtasks,
    },
  ];
};

export const normalizeMindHubPayload = (payload, fallbackDate, sourceMessage = "") => {
  const exactDateFromMessage = extractExactDateFromText(sourceMessage);
  const rawDrafts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.drafts)
    ? payload.drafts
    : Array.isArray(payload?.tasks)
    ? payload.tasks
    : [];

  const drafts = rawDrafts
    .filter((task) => task && typeof task === "object")
    .map((task) => {
      const rawTitle = typeof task.title === "string" ? task.title.trim() : "";
      const subtasks = Array.isArray(task.subtasks)
        ? task.subtasks
            .map((subtask, index) => ({
              title:
                typeof subtask === "string"
                  ? subtask.trim()
                  : typeof subtask?.title === "string"
                  ? subtask.title.trim()
                  : "",
              completed:
                typeof subtask === "object" && subtask !== null
                  ? Boolean(subtask.completed)
                  : false,
              position:
                typeof subtask === "object" &&
                subtask !== null &&
                Number.isInteger(subtask.position)
                  ? subtask.position
                  : index,
            }))
            .filter((subtask) => subtask.title.length > 0)
        : [];
      const normalizedDate = normalizeDate(task.date, fallbackDate);
      const taskDate =
        exactDateFromMessage && normalizedDate === fallbackDate
          ? exactDateFromMessage
          : normalizedDate;
      const titleWithoutDate = stripExactDateFromTitle(rawTitle);

      return {
        title: titleWithoutDate || rawTitle,
        date: taskDate,
        priority: normalizePriority(task.priority),
        energyLevel: normalizeEnergyLevel(task.energyLevel),
        category:
          typeof task.category === "string" && task.category.trim()
            ? task.category.trim()
            : "Быт",
        subtasks,
      };
    })
    .filter((task) => task.title.length > 0);

  const reply =
    typeof payload?.reply === "string" && payload.reply.trim()
      ? payload.reply.trim()
      : null;

  return { drafts: mergeCourseworkSteps(sourceMessage, drafts), reply };
};

const extractCourseworkSubtasks = (message) => {
  const normalizedMessage = message.replace(/\s+/g, " ").trim();
  const stepsMatch = normalizedMessage.match(
    /(?:сначала|сперва)\s+(.+?)(?:,\s*|\s+)(?:потом|затем|после этого|далее)\s+(.+?)(?:[.!?]|$)/i
  );

  if (!stepsMatch) return [];

  return [stepsMatch[1], stepsMatch[2]]
    .map((step) =>
      step
        .replace(/^(надо|нужно|необходимо)\s+/i, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .map((title, index) => ({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      completed: false,
      position: index,
    }));
};

export const parseCourseworkPlan = (message, fallbackDate) => {
  const text = message.toLowerCase();
  const hasCourseworkGoal = /курс|курсов|курсач|диплом|реферат/.test(text);
  const hasSequentialSteps =
    /сначала|сперва/.test(text) &&
    /потом|затем|после этого|далее/.test(text);

  if (!hasCourseworkGoal || !hasSequentialSteps) return null;

  const exactDate = extractExactDateFromText(message);
  const subtasks = extractCourseworkSubtasks(message);

  return {
    drafts: [
      {
        title: "Сделать курсовую работу",
        date: exactDate || fallbackDate,
        priority: /срочн|важн|дедлайн|горит/.test(text)
          ? priorityMap.P1
          : priorityMap.P2,
        energyLevel: /кучу сил|много сил|сложн|тяжел|долго|больш/.test(text)
          ? "high"
          : "med",
        category: "Учеба",
        subtasks,
      },
    ],
    reply: "Я собрал черновик с шагами. Проверь его перед сохранением.",
  };
};
