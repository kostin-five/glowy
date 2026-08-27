import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import {
  consumeAuthenticatedAiRequest,
  getAuthenticatedAiRequestLimit,
} from "../ai/ai-limits.service.js";
import { generateTaskDraftFromText } from "../ai/note-task-draft.service.js";
import { createTaskForUser } from "../tasks/task-write.service.js";
import { createTelegramApiClient } from "./telegram-api.client.js";
import { createTelegramLinkService, TelegramLinkError } from "./telegram-link.service.js";
import {
  createTelegramUpdateService,
  getDateOnlyInTimeZone,
  getTelegramActor,
} from "./telegram-update.service.js";

const HELP_LINKED = `Команды Glowy:
/today — задачи на сегодня
/add — подготовить черновик задачи
/energy — посмотреть или изменить энергию
/unlink — отключить Telegram
/help — эта справка

Задача сохраняется только после кнопки «Сохранить».`;
const HELP_UNLINKED =
  "Сначала подключи Telegram в настройках Glowy. Создай одноразовый код и открой ссылку на бота.";
const ENERGY_VALUES = new Set([20, 40, 60, 80, 100]);
const ADD_TTL_MS = 10 * 60 * 1000;
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
  createTask = createTaskForUser,
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
      ]),
    });

  const handleAdd = async ({ actor, connection, text, updateId }) => {
    if (!text || text.length > 4_000) {
      await send(
        actor.chatId,
        text ? "Сократи текст до 4 000 символов." : "Отправь текст будущей задачи."
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
      await send(actor.chatId, "Лимит AI-запросов исчерпан. Попробуй после обновления лимита.");
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
      await send(actor.chatId, "Не удалось подготовить черновик. Попробуй немного позже.");
      return;
    }

    const usage = await consumeAiRequest(connection.userId);
    if (!usage.allowed) {
      await send(actor.chatId, "Лимит AI-запросов исчерпан. Задача не создана.");
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

  const handleMessage = async (actor, updateId) => {
    const connection = await getConnection(actor.telegramUserId);
    const text = typeof actor.message?.text === "string" ? actor.message.text.trim() : "";
    const [command = "", ...args] = text.split(/\s+/);
    const commandName = command.toLowerCase().split("@")[0];

    if (actor.message?.voice) {
      await send(
        actor.chatId,
        connection
          ? "В этой версии я пока не распознаю голос бесплатно. Отправь мысль текстом — подготовлю черновик задачи."
          : HELP_UNLINKED
      );
      return;
    }

    if (commandName === "/start") {
      if (connection) {
        await send(actor.chatId, `Telegram уже подключён к Glowy.\n\n${HELP_LINKED}`);
        return;
      }
      const code = args[0];
      if (!code) {
        await send(actor.chatId, `Привет! Я помогаю быстро работать с задачами Glowy.\n\n${HELP_UNLINKED}`);
        return;
      }
      try {
        await links.consumeCode({
          code,
          telegramUserId: actor.telegramUserId,
          chatId: actor.chatId,
        });
        await send(actor.chatId, `Telegram подключён.\n\n${HELP_LINKED}`);
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
      await send(actor.chatId, connection ? HELP_LINKED : HELP_UNLINKED);
      return;
    }

    if (commandName === "/unlink") {
      if (!connection) {
        await send(actor.chatId, "Telegram уже отключён от Glowy.");
        return;
      }
      await links.unlinkTelegram(actor.telegramUserId);
      await send(actor.chatId, "Telegram отключён. Данные Glowy больше недоступны в этом чате.");
      return;
    }

    if (!connection) {
      await send(actor.chatId, HELP_UNLINKED);
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
        await send(actor.chatId, "На сегодня незавершённых задач нет. Можно спокойно выбрать следующий шаг позже.");
        return;
      }
      const list = tasks.map((task, index) => `${index + 1}. ${task.title}`).join("\n");
      await send(actor.chatId, `Задачи на сегодня:\n${list}`);
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
            pendingCommandExpiresAt: new Date(now().getTime() + ADD_TTL_MS),
          },
        });
        await send(actor.chatId, "Отправь текст мысли следующим сообщением. Я покажу черновик до сохранения.");
        return;
      }
      await handleAdd({ actor, connection, text: addText, updateId });
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

    await send(actor.chatId, `Не понял команду.\n\n${HELP_LINKED}`);
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
      await send(actor.chatId, HELP_UNLINKED);
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
      await send(actor.chatId, `Энергия обновлена: ${energy} из 100.`);
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
