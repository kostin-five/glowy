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

    throw new Error("Gemini returned non-JSON mind hub response");
  }
};

export const buildMindHubParsePrompt = (
  message,
  today,
  activeTasksContext = ""
) => `Ты — эксперт по планированию задач в приложении Glowy.${activeTasksContext}

Твоя цель — преобразовать хаотичный текст пользователя в строгий JSON.

Сегодня: ${today}. Используй эту дату ТОЛЬКО как точку отсчёта для относительных формулировок.

Верни JSON строгого формата:
{"tasks": [...], "reply": "..."}

ПРАВИЛА ОТВЕТА:
1. Если пользователь просто делится состоянием, тревогой, вопросом или просит поддержки (без конкретных дел) — tasks: [], reply: "короткий и теплый ответ".
2. Если пользователь перечисляет дела, планы, обязательства — tasks: [...], reply: null (или короткое подтверждение, если есть эмоции).
3. Если в тексте есть и эмоции, и дела — tasks: [...], reply: "короткая поддержка". Это обязательно для смешанных фраз вроде "я устал, но надо убраться".

НЕ заставляй модель писать reply при каждой задаче. Если задач много и они понятны, reply может быть null.

КЛАССИФИКАЦИЯ:
- Создавай задачи, если пользователь пишет конкретные действия: "надо", "нужно", "сделать", "купить", "ответить", "подготовить", "записаться", "позвонить", "сдать", "убраться".
- НЕ создавай задачи из чистых эмоций и разговорных сообщений: "мне плохо", "я устал", "как дела?", "не знаю что делать", "всё навалилось", если там нет конкретного действия.
- Если пользователь просит совета или поддержки, верни теплый reply и пустой tasks.
- Если пользователь смешал эмоции и дела, выдели только реальные дела в tasks, а reply обязательно сделай коротким и поддерживающим.
- Если пользователь просит "выписать/показать задачи", перечисли все АКТИВНЫЕ ЗАДАЧИ из контекста в reply, tasks: [].
- Если пользователь просит помощи "с чего начать", проанализируй АКТИВНЫЕ ЗАДАЧИ и предложи 1-2 подходящие из них, tasks: [].
- Если пользователь просит создать задачу, проверь АКТИВНЫЕ ЗАДАЧИ. Если задача с тем же смыслом уже есть, верни tasks: [] и reply: "Такая задача уже есть: [название]".
- Если пользователь явно просит новую задачу, меняет дату, категорию или смысл — создай новую задачу.
- Никогда не изменяй и не перезаписывай существующие задачи.
- Не придумывай задачи, которых нет в тексте.
- В поле reply пиши только обычный текст без Markdown и форматирования. Нельзя использовать **жирный текст**, списки, нумерацию, bullet points, таблицы, заголовки, emoji как маркеры списка или спецразметку. Если перечисляешь задачи, пиши их через точку с запятой в одной-двух обычных фразах.

ВАЖНОЕ ПРАВИЛО ПОДЗАДАЧ (SUBTASKS):
Ты должен строго отличать независимые задачи от шагов, ведущих к одной цели.

Если пользователь описывает одну глобальную цель и перечисляет шаги для её достижения, создай ТОЛЬКО ОДНУ главную задачу, а все шаги помести в массив subtasks в виде строк. Слова "сначала", "потом", "затем", "после этого" почти всегда означают последовательные шаги одной задачи, а не отдельные задачи.
ПРИМЕР ВХОДА: "Очень срочно нужно сделать курсач. Сначала собрать источники, потом написать введение."
ПРАВИЛЬНЫЙ ВЫХОД: Одна задача с title: "Сделать курсовую работу", subtasks: ["Собрать источники", "Написать введение"].
ПРИМЕР ВХОДА: "Очень срочно нужно сделать курсач по учебе, отнимет кучу сил. Сначала собрать источники, потом написать введение."
ПРАВИЛЬНЫЙ ВЫХОД: Одна задача с title: "Сделать курсовую работу", category: "Учеба", energyLevel: "high", priority: "P1", subtasks: ["Собрать источники", "Написать введение"].

Создавай несколько независимых задач ТОЛЬКО если дела абсолютно не связаны между собой контекстом.
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
- Не используй Markdown нигде в JSON, включая поле reply. Верни только валидный JSON.

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
  const rawTasks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.tasks)
    ? payload.tasks
    : [];

  const tasks = rawTasks
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
    !tasks.length && typeof payload?.reply === "string"
      ? payload.reply.trim()
      : null;

  return { tasks: mergeCourseworkSteps(sourceMessage, tasks), reply };
};

const inferFallbackCategory = (title) => {
  const value = title.toLowerCase();

  if (/бег|пробеж|подтяг|зал|трениров|спорт|фитнес|упражнен/.test(value)) {
    return "Спорт";
  }

  if (/уч|экзамен|тест|препод|курс|диплом|курсов|отчет|отчёт|доклад|cyva|универ/.test(value)) {
    return "Учеба";
  }

  if (/врач|здоров|лекар|сон|психолог/.test(value)) {
    return "Здоровье";
  }

  if (/работ|проект|презентац|созвон|клиент/.test(value)) {
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

export const parseMindHubFallback = (message, fallbackDate) => {
  const exactDate = extractExactDateFromText(message);

  return message
    .split(/[\n,;]+|(?:\s+и\s+)/i)
    .map((title) => title.trim())
    .filter((title) => title.length > 0)
    .map((title) => {
      const titleWithoutDate = stripExactDateFromTitle(title);

      return {
        title: titleWithoutDate || title,
        date: exactDate || fallbackDate,
        priority: priorityMap.P2,
        energyLevel: inferFallbackEnergy(title),
        category: inferFallbackCategory(title),
        subtasks: [],
      };
    });
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
    tasks: [
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
    reply: null,
  };
};
