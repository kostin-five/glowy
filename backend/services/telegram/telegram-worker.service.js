import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  consumeAuthenticatedAiRequest,
  getAuthenticatedAiRequestLimit,
} from "../ai/ai-limits.service.js";
import { generateTaskDraftFromText } from "../ai/note-task-draft.service.js";
import { getCoachReply } from "../ai/mind-hub.service.js";
import { createTaskForUser } from "../tasks/task-write.service.js";
import { completeTaskForUser } from "../tasks/task-completion.service.js";
import { createTelegramApiClient } from "./telegram-api.client.js";
import { createTelegramLinkService, TelegramLinkError } from "./telegram-link.service.js";
import {
  createTelegramUpdateService,
  getDateOnlyInTimeZone,
  getTelegramActor,
} from "./telegram-update.service.js";
import { createTelegramMiniAppUrlService } from "./telegram-mini-app-url.service.js";

const HELP_LINKED = `Команды Glowy:
/app — открыть полное приложение
/today — задачи на сегодня
/tasks — ближайшие задачи
/add — подготовить черновик задачи
/done — завершить задачу
/energy — посмотреть или изменить энергию
/progress — посмотреть прогресс
/ai — задать вопрос Glowy AI
/notes, /analytics, /settings — открыть раздел
/unlink — отключить Telegram
/help — эта справка

Задача сохраняется только после кнопки «Сохранить».`;
const HELP_UNLINKED =
  "Открой Glowy внутри Telegram и войди или зарегистрируйся. Аккаунт свяжется автоматически.";
const ENERGY_VALUES = new Set([20, 40, 60, 80, 100]);
const PENDING_COMMAND_TTL_MS = 10 * 60 * 1000;
const DRAFT_TTL_MS = 30 * 60 * 1000;

const buttons = (rows) => ({ inline_keyboard: rows });
const callbackButton = (text, data) => ({ text, callback_data: data });

const formatDraft = (draft) => {
  const date = draft.date ? `\nДата: ${draft.date}` : "";
  return `Черновик задачи:\n${draft.title}${date}\nПриоритет: ${draft.priority}\nЭнергия: ${draft.energyLevel}\nКатегория: ${draft.category}`;
};

const getErrorCode = (error) =>
  typeof error?.code === "string" && error.code.length <= 60
    ? error.code
    : "TELEGRAM_UPDATE_FAILED";

const isRetryable = (error) =>
  error?.retryable === true || ["P1001", "P1002", "P2024"].includes(error?.code);

export const createTelegramWorker = ({
  db = prisma,
  api = createTelegramApiClient(),
  links = createTelegramLinkService({ db }),
  updates = createTelegramUpdateService({ db }),
  previewAiLimit = getAuthenticatedAiRequestLimit,
  consumeAiRequest = consumeAuthenticatedAiRequest,
  generateDraft = generateTaskDraftFromText,
  answerAi = getCoachReply,
  createTask = createTaskForUser,
  completeTask = completeTaskForUser,
  miniAppUrls = createTelegramMiniAppUrlService(),
  now = () => new Date(),
  timeZone = "Europe/Moscow",
  pollIntervalMs = 1_000,
} = {}) => {
  let timer = null;
  let cleanupTimer = null;
  let running = false;
  let draining = false;

  const send = (chatId, text, extra = {}) =>
    api.sendMessage({ chat_id: chatId, text, ...extra });

  const miniAppButton = (text = "Открыть Glowy", target = "home") => {
    const url = miniAppUrls.build(target);
    return url ? { text, web_app: { url } } : null;
  };

  const withMiniApp = (target = "home", text = "Открыть Glowy") => {
    const button = miniAppButton(text, target);
    return button ? { reply_markup: buttons([[button]]) } : {};
  };

  const navigationMarkup = () => {
    const rows = [
      [miniAppButton("Открыть Glowy", "home"), miniAppButton("Задачи", "tasks")],
      [miniAppButton("Заметки", "notes"), miniAppButton("Glowy AI", "ai")],
      [miniAppButton("Прогресс", "progress"), miniAppButton("Аналитика", "analytics")],
      [miniAppButton("Настройки", "settings")],
    ].map((row) => row.filter(Boolean));
    return { reply_markup: buttons(rows.filter((row) => row.length)) };
  };

  const getConnection = (telegramUserId) =>
    db.telegramConnection.findUnique({
      where: { telegramUserId },
      select: {
        id: true,
        userId: true,
        chatId: true,
        pendingCommand: true,
        pendingCommandExpiresAt: true,
      },
    });

  const sendDraft = (chatId, draft) =>
    send(chatId, formatDraft(draft), {
      reply_markup: buttons([
        [
          callbackButton("Сохранить", `tg:save:${draft.id}`),
          callbackButton("Отменить", `tg:cancel:${draft.id}`),
        ],
        [miniAppButton("Открыть задачи", "tasks")].filter(Boolean),
      ]),
    });

  const handleAdd = async ({ actor, connection, text, updateId }) => {
    if (!text || text.length > 4_000) {
      await send(
        actor.chatId,
        text ? "Сократи текст до 4 000 символов." : "Отправь текст будущей задачи.",
        withMiniApp("tasks", "Открыть задачи")
      );
      return;
    }

    const existingDraft = await db.telegramTaskDraft.findUnique({
      where: { sourceUpdateId: updateId },
    });
    if (existingDraft) {
      if (existingDraft.status === "PENDING" && existingDraft.expiresAt > now()) {
        await sendDraft(actor.chatId, existingDraft);
      }
      return;
    }

    const preview = await previewAiLimit(connection.userId);
    if (!preview.allowed) {
      await send(actor.chatId, "Лимит AI-запросов исчерпан. Попробуй после обновления лимита.", withMiniApp("tasks", "Открыть задачи"));
      return;
    }

    let normalizedDraft;
    try {
      normalizedDraft = await generateDraft(
        text,
        { userId: connection.userId },
        "Telegram task draft"
      );
    } catch (error) {
      if (isRetryable(error)) throw error;
      await send(actor.chatId, "Не удалось подготовить черновик. Попробуй немного позже.", withMiniApp("tasks", "Открыть задачи"));
      return;
    }

    const usage = await consumeAiRequest(connection.userId);
    if (!usage.allowed) {
      await send(actor.chatId, "Лимит AI-запросов исчерпан. Задача не создана.", withMiniApp("tasks", "Открыть задачи"));
      return;
    }

    let draft;
    try {
      draft = await db.telegramTaskDraft.create({
        data: {
          ...normalizedDraft,
          connectionId: connection.id,
          userId: connection.userId,
          expiresAt: new Date(now().getTime() + DRAFT_TTL_MS),
          sourceUpdateId: updateId,
        },
      });
    } catch (error) {
      if (error?.code !== "P2002") throw error;
      draft = await db.telegramTaskDraft.findUnique({ where: { sourceUpdateId: updateId } });
      if (!draft) throw error;
    }
    await sendDraft(actor.chatId, draft);
  };

  const handleAi = async ({ actor, connection, text }) => {
    if (!text || text.length > 4_000) {
      await send(
        actor.chatId,
        text ? "Сократи вопрос до 4 000 символов." : "Отправь вопрос для Glowy AI.",
        withMiniApp("ai", "Открыть Glowy AI")
      );
      return;
    }
    const preview = await previewAiLimit(connection.userId);
    if (!preview.allowed) {
      await send(actor.chatId, "Лимит AI-запросов исчерпан. Попробуй после обновления лимита.", withMiniApp("ai", "Открыть Glowy AI"));
      return;
    }
    let reply;
    try {
      reply = await answerAi(text, [], undefined, { userId: connection.userId });
    } catch (error) {
      if (isRetryable(error)) throw error;
      await send(actor.chatId, "Glowy AI пока не ответил. Попробуй немного позже.", withMiniApp("ai", "Открыть Glowy AI"));
      return;
    }
    const usage = await consumeAiRequest(connection.userId);
    if (!usage.allowed) {
      await send(actor.chatId, "Лимит AI-запросов исчерпан. Ответ не сохранён.", withMiniApp("ai", "Открыть Glowy AI"));
      return;
    }
    await send(actor.chatId, String(reply || "Я рядом. Попробуй сформулировать вопрос ещё раз.").slice(0, 4_000), withMiniApp("ai", "Продолжить в Glowy AI"));
  };

  const handleMessage = async (actor, updateId) => {
    const connection = await getConnection(actor.telegramUserId);
    const text = typeof actor.message?.text === "string" ? actor.message.text.trim() : "";
    const [command = "", ...args] = text.split(/\s+/);
    const commandName = command.toLowerCase().split("@")[0];

    if (actor.message?.voice) {
      await send(
        actor.chatId,
        connection
          ? "В этой версии я пока не распознаю голос бесплатно. Отправь мысль текстом или открой Glowy."
          : "Открой Glowy и войди или зарегистрируйся внутри Telegram.",
        withMiniApp(connection ? "ai" : "home")
      );
      return;
    }

    if (commandName === "/start") {
      if (connection) {
        await send(
          actor.chatId,
          `Telegram уже подключён к Glowy.\n\n${HELP_LINKED}`,
          navigationMarkup()
        );
        return;
      }
      const code = args[0];
      if (!code) {
        await send(
          actor.chatId,
          "Привет! Открой Glowy, зарегистрируйся или войди прямо внутри Telegram.",
          withMiniApp()
        );
        return;
      }
      try {
        await links.consumeCode({
          code,
          telegramUserId: actor.telegramUserId,
          chatId: actor.chatId,
        });
        await send(actor.chatId, `Telegram подключён.\n\n${HELP_LINKED}`, withMiniApp());
      } catch (error) {
        const message =
          error instanceof TelegramLinkError
            ? error.message
            : "Не удалось подключить Telegram. Создай новый код в настройках Glowy.";
        await send(actor.chatId, message);
      }
      return;
    }

    if (commandName === "/help") {
      await send(
        actor.chatId,
        connection
          ? HELP_LINKED
          : "Зарегистрируйся или войди в Glowy прямо внутри Telegram.",
        connection ? navigationMarkup() : withMiniApp()
      );
      return;
    }

    if (commandName === "/app") {
      await send(actor.chatId, "Glowy готов открыться внутри Telegram.", withMiniApp());
      return;
    }

    if (commandName === "/unlink") {
      if (!connection) {
        await send(actor.chatId, "Telegram уже отключён от Glowy.");
        return;
      }
      await send(actor.chatId, "Отключить Telegram от Glowy? Аккаунт и данные сохранятся.", {
        reply_markup: buttons([[
          callbackButton("Отключить", "tg:unlink-confirm:yes"),
          callbackButton("Отменить", "tg:flow-cancel:unlink"),
        ]]),
      });
      return;
    }

    if (!connection) {
      await send(
        actor.chatId,
        "Сначала подключи Telegram: открой Glowy и войди или зарегистрируйся прямо здесь.",
        withMiniApp()
      );
      return;
    }

    if (commandName === "/today") {
      const date = getDateOnlyInTimeZone(now(), timeZone);
      const tasks = await db.task.findMany({
        where: { userId: connection.userId, date, completed: false },
        orderBy: [{ priority: "asc" }, { id: "asc" }],
        take: 12,
      });
      if (!tasks.length) {
        await send(actor.chatId, "На сегодня незавершённых задач нет. Можно спокойно выбрать следующий шаг позже.", withMiniApp("tasks", "Открыть задачи"));
        return;
      }
      const list = tasks.map((task, index) => `${index + 1}. ${task.title}`).join("\n");
      await send(actor.chatId, `Задачи на сегодня:\n${list}`, withMiniApp("tasks", "Открыть задачи"));
      return;
    }

    if (commandName === "/tasks") {
      const tasks = await db.task.findMany({
        where: { userId: connection.userId, completed: false },
        orderBy: [{ date: "asc" }, { id: "asc" }],
        take: 12,
      });
      const ordered = [...tasks].sort((left, right) => {
        if (!left.date && right.date) return 1;
        if (left.date && !right.date) return -1;
        return String(left.date).localeCompare(String(right.date)) || left.id - right.id;
      });
      const text = ordered.length
        ? `Ближайшие задачи:\n${ordered.map((task, index) => `${index + 1}. ${task.title}${task.date ? ` — ${task.date}` : ""}`).join("\n")}`
        : "Активных задач пока нет.";
      await send(actor.chatId, text, withMiniApp("tasks", "Открыть задачи"));
      return;
    }

    if (commandName === "/progress") {
      const [user, completedTasks] = await Promise.all([
        db.user.findUnique({ where: { id: connection.userId }, select: { xp: true, level: true } }),
        db.task.count({ where: { userId: connection.userId, completed: true } }),
      ]);
      if (!user) {
        await send(actor.chatId, "Аккаунт Glowy больше недоступен.");
        return;
      }
      await send(
        actor.chatId,
        `Твой прогресс:\nУровень: ${user.level}\nXP: ${user.xp}\nВыполнено задач: ${completedTasks}`,
        withMiniApp("progress", "Открыть прогресс")
      );
      return;
    }

    const navigationTargets = {
      "/home": ["home", "Открыть главную"],
      "/notes": ["notes", "Открыть заметки"],
      "/analytics": ["analytics", "Открыть аналитику"],
      "/settings": ["settings", "Открыть настройки"],
    };
    if (navigationTargets[commandName]) {
      const [target, label] = navigationTargets[commandName];
      await send(actor.chatId, label, withMiniApp(target, label));
      return;
    }

    if (commandName === "/energy") {
      const user = await db.user.findUnique({
        where: { id: connection.userId },
        select: { currentEnergy: true },
      });
      if (!user) {
        await send(actor.chatId, "Аккаунт Glowy больше недоступен. Подключи Telegram заново.");
        return;
      }
      await send(actor.chatId, `Текущая энергия: ${user.currentEnergy} из 100.`, {
        reply_markup: buttons([
          [20, 40, 60].map((value) => callbackButton(String(value), `tg:energy:${value}`)),
          [80, 100].map((value) => callbackButton(String(value), `tg:energy:${value}`)),
          [callbackButton("Отменить", "tg:flow-cancel:energy")],
          [miniAppButton("Открыть главную", "home")].filter(Boolean),
        ]),
      });
      return;
    }

    if (commandName === "/add") {
      const addText = args.join(" ").trim();
      if (!addText) {
        await db.telegramConnection.update({
          where: { id: connection.id },
          data: {
            pendingCommand: "ADD",
            pendingCommandExpiresAt: new Date(now().getTime() + PENDING_COMMAND_TTL_MS),
          },
        });
        await send(actor.chatId, "Отправь текст мысли следующим сообщением. Я покажу черновик до сохранения.", {
          reply_markup: buttons([
            [callbackButton("Отменить", "tg:flow-cancel:add")],
            [miniAppButton("Открыть задачи", "tasks")].filter(Boolean),
          ]),
        });
        return;
      }
      await handleAdd({ actor, connection, text: addText, updateId });
      return;
    }

    if (commandName === "/done") {
      const tasks = await db.task.findMany({
        where: { userId: connection.userId, completed: false },
        orderBy: [{ date: "asc" }, { id: "asc" }],
        take: 8,
      });
      if (!tasks.length) {
        await send(actor.chatId, "Нет активных задач для завершения.", withMiniApp("tasks", "Открыть задачи"));
        return;
      }
      await send(actor.chatId, "Какую задачу отметить выполненной?", {
        reply_markup: buttons([
          ...tasks.map((task) => [callbackButton(task.title.slice(0, 48), `tg:done-pick:${task.id}`)]),
          [callbackButton("Отменить", "tg:flow-cancel:done")],
          [miniAppButton("Открыть задачи", "tasks")].filter(Boolean),
        ]),
      });
      return;
    }

    if (commandName === "/ai") {
      const question = args.join(" ").trim();
      if (!question) {
        await db.telegramConnection.update({
          where: { id: connection.id },
          data: {
            pendingCommand: "AI",
            pendingCommandExpiresAt: new Date(now().getTime() + PENDING_COMMAND_TTL_MS),
          },
        });
        await send(actor.chatId, "Отправь вопрос следующим сообщением. Для отмены используй кнопку.", {
          reply_markup: buttons([
            [callbackButton("Отменить", "tg:flow-cancel:ai")],
            [miniAppButton("Открыть Glowy AI", "ai")].filter(Boolean),
          ]),
        });
        return;
      }
      await handleAi({ actor, connection, text: question });
      return;
    }

    if (
      text &&
      connection.pendingCommand === "ADD" &&
      connection.pendingCommandExpiresAt?.getTime() > now().getTime()
    ) {
      await db.telegramConnection.update({
        where: { id: connection.id },
        data: { pendingCommand: null, pendingCommandExpiresAt: null },
      });
      await handleAdd({ actor, connection, text, updateId });
      return;
    }

    if (
      text &&
      connection.pendingCommand === "AI" &&
      connection.pendingCommandExpiresAt?.getTime() > now().getTime()
    ) {
      await db.telegramConnection.update({
        where: { id: connection.id },
        data: { pendingCommand: null, pendingCommandExpiresAt: null },
      });
      await handleAi({ actor, connection, text });
      return;
    }

    if (
      connection.pendingCommand &&
      connection.pendingCommandExpiresAt?.getTime() <= now().getTime()
    ) {
      await db.telegramConnection.update({
        where: { id: connection.id },
        data: { pendingCommand: null, pendingCommandExpiresAt: null },
      });
      await send(
        actor.chatId,
        "Время ожидания истекло. Запусти команду ещё раз — данные не изменены.",
        navigationMarkup()
      );
      return;
    }

    await send(actor.chatId, `Не понял команду.\n\n${HELP_LINKED}`, navigationMarkup());
  };

  const handleDraftCallback = async (actor, connection, action, draftId) => {
    const current = now();
    if (action === "cancel") {
      const canceled = await db.telegramTaskDraft.updateMany({
        where: {
          id: draftId,
          connectionId: connection.id,
          userId: connection.userId,
          status: "PENDING",
          expiresAt: { gt: current },
        },
        data: { status: "CANCELED" },
      });
      await send(
        actor.chatId,
        canceled.count === 1 ? "Черновик отменён. Задача не создана." : "Черновик уже обработан или истёк."
      );
      return;
    }

    const result = await db.$transaction(async (tx) => {
      const draft = await tx.telegramTaskDraft.findUnique({ where: { id: draftId } });
      if (
        !draft ||
        draft.connectionId !== connection.id ||
        draft.userId !== connection.userId
      ) {
        return { state: "INVALID" };
      }
      if (draft.status === "CONFIRMED") return { state: "CONFIRMED", taskId: draft.taskId };
      if (draft.status !== "PENDING" || draft.expiresAt <= current) {
        if (draft.status === "PENDING") {
          await tx.telegramTaskDraft.update({
            where: { id: draft.id },
            data: { status: "EXPIRED" },
          });
        }
        return { state: "EXPIRED" };
      }

      const claimed = await tx.telegramTaskDraft.updateMany({
        where: { id: draft.id, status: "PENDING", expiresAt: { gt: current } },
        data: { status: "CONFIRMED", confirmedAt: current },
      });
      if (claimed.count !== 1) return { state: "CONFIRMED" };
      const task = await createTask({
        db: tx,
        userId: connection.userId,
        input: draft,
        include: { subtasks: true },
      });
      await tx.telegramTaskDraft.update({
        where: { id: draft.id },
        data: { taskId: task.id },
      });
      return { state: "CREATED", task };
    });

    const text =
      result.state === "CREATED"
        ? `Задача сохранена: ${result.task.title}`
        : result.state === "CONFIRMED"
          ? "Эта задача уже сохранена."
          : result.state === "EXPIRED"
            ? "Черновик истёк. Создай новый через /add."
            : "Не удалось подтвердить этот черновик.";
    await send(actor.chatId, text);
  };

  const handleCallback = async (actor) => {
    await api.answerCallbackQuery({ callback_query_id: actor.callback.id });
    const connection = await getConnection(actor.telegramUserId);
    if (!connection) {
      await send(actor.chatId, HELP_UNLINKED, withMiniApp());
      return;
    }

    const data = typeof actor.callback?.data === "string" ? actor.callback.data : "";
    const [prefix, action, value] = data.split(":");
    if (prefix !== "tg") {
      await send(actor.chatId, "Это действие больше недоступно.");
      return;
    }

    if (action === "energy") {
      const energy = Number(value);
      if (!ENERGY_VALUES.has(energy)) {
        await send(actor.chatId, "Выбери уровень энергии ещё раз через /energy.");
        return;
      }
      await db.user.update({
        where: { id: connection.userId },
        data: { currentEnergy: energy },
      });
      await send(
        actor.chatId,
        `Энергия обновлена: ${energy} из 100.`,
        withMiniApp("home", "Открыть главную")
      );
      return;
    }

    if (action === "flow-cancel") {
      await db.telegramConnection.update({
        where: { id: connection.id },
        data: { pendingCommand: null, pendingCommandExpiresAt: null },
      });
      await send(actor.chatId, "Действие отменено. Данные не изменены.", navigationMarkup());
      return;
    }

    if (action === "unlink-confirm" && value === "yes") {
      await links.unlinkTelegram(actor.telegramUserId);
      await send(
        actor.chatId,
        "Telegram отключён. Аккаунт Glowy и все данные сохранены. При следующем открытии нужно будет войти снова.",
        withMiniApp()
      );
      return;
    }

    if (action === "done-pick") {
      const taskId = Number(value);
      if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        await send(actor.chatId, "Эта задача больше недоступна. Открой список снова через /done.");
        return;
      }
      const task = await db.task.findFirst({
        where: { id: taskId, userId: connection.userId, completed: false },
        select: { id: true, title: true },
      });
      if (!task) {
        await send(actor.chatId, "Задача уже выполнена или больше недоступна.");
        return;
      }
      await send(actor.chatId, `Отметить задачу выполненной?\n${task.title}`, {
        reply_markup: buttons([[
          callbackButton("Выполнено", `tg:done-confirm:${task.id}`),
          callbackButton("Отменить", `tg:done-cancel:${task.id}`),
        ], [miniAppButton("Открыть задачи", "tasks")].filter(Boolean)]),
      });
      return;
    }

    if (action === "done-confirm") {
      const taskId = Number(value);
      if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        await send(actor.chatId, "Эта задача больше недоступна.");
        return;
      }
      const result = await completeTask({
        db,
        userId: connection.userId,
        taskId,
        completedOn: getDateOnlyInTimeZone(now(), timeZone),
      });
      const message = result.state === "COMPLETED"
        ? `Готово! Задача выполнена${result.xpReward ? `, +${result.xpReward} XP` : ""}.`
        : result.state === "ALREADY_COMPLETED"
          ? "Эта задача уже отмечена выполненной. Повторно XP не начислены."
          : "Задача больше недоступна.";
      await send(actor.chatId, message, withMiniApp("tasks", "Открыть задачи"));
      return;
    }

    if (action === "done-cancel") {
      await send(
        actor.chatId,
        "Завершение отменено. Задача не изменена.",
        withMiniApp("tasks", "Открыть задачи")
      );
      return;
    }

    if ((action === "save" || action === "cancel") && value) {
      await handleDraftCallback(actor, connection, action, value);
      if (actor.callback.message?.message_id) {
        await api.editMessageReplyMarkup({
          chat_id: actor.chatId,
          message_id: actor.callback.message.message_id,
          reply_markup: buttons([]),
        });
      }
      return;
    }
    await send(actor.chatId, "Это действие больше недоступно.");
  };

  const processUpdate = async (payload, updateId) => {
    const actor = getTelegramActor(payload);
    if (!actor) return;
    if (!actor.privateChat) {
      await send(actor.chatId, "Я работаю только в личном чате и не показываю данные Glowy в группах.");
      return;
    }
    if (actor.callback) return handleCallback(actor);
    return handleMessage(actor, updateId);
  };

  const runOnce = async () => {
    let update;
    try {
      update = await updates.claimNext();
    } catch (error) {
      logger.error("telegram.update.claim_failed", { error, statusCode: 503 });
      return false;
    }
    if (!update) return false;
    try {
      await processUpdate(update.payload, update.updateId);
      await updates.complete(update.updateId);
    } catch (error) {
      const errorCode = getErrorCode(error);
      logger.error("telegram.update.failed", {
        error,
        errorCode,
        statusCode: error?.status || 500,
      });
      await updates.fail(update, errorCode, isRetryable(error));
    }
    return true;
  };

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      for (let count = 0; count < 20 && (await runOnce()); count += 1) {
        // Bounded drain avoids starving the event loop.
      }
    } finally {
      draining = false;
    }
  };

  const notify = () => {
    if (running) queueMicrotask(() => void drain());
  };

  const start = () => {
    if (running) return;
    running = true;
    timer = setInterval(() => void drain(), pollIntervalMs);
    timer.unref?.();
    cleanupTimer = setInterval(() => void updates.cleanup(), 60 * 60 * 1000);
    cleanupTimer.unref?.();
    void updates.cleanup();
    notify();
  };

  const stop = () => {
    running = false;
    if (timer) clearInterval(timer);
    if (cleanupTimer) clearInterval(cleanupTimer);
    timer = null;
    cleanupTimer = null;
  };

  return { processUpdate, runOnce, drain, notify, start, stop };
};

export default createTelegramWorker;
