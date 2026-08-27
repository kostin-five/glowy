import { createTelegramWorker } from "../services/telegram/telegram-worker.service.js";

export const linkedConnection = {
  id: 5,
  userId: 42,
  chatId: "1001",
  pendingCommand: null,
  pendingCommandExpiresAt: null,
};

export const messageUpdate = (value = {}) => ({
  update_id: 10,
  message: {
    message_id: 2,
    from: { id: 1001 },
    chat: { id: 1001, type: "private" },
    ...value,
  },
});

export const callbackUpdate = (data) => ({
  update_id: 11,
  callback_query: {
    id: "callback-1",
    from: { id: 1001 },
    data,
    message: {
      message_id: 7,
      chat: { id: 1001, type: "private" },
    },
  },
});

export const createApiRecorder = () => {
  const calls = [];
  return {
    calls,
    api: {
      sendMessage: async (payload) => { calls.push(["sendMessage", payload]); return {}; },
      answerCallbackQuery: async (payload) => { calls.push(["answerCallbackQuery", payload]); return true; },
      editMessageReplyMarkup: async (payload) => { calls.push(["editMessageReplyMarkup", payload]); return true; },
    },
  };
};

export const createWorkerFixture = ({ db, api, ...overrides }) =>
  createTelegramWorker({
    db,
    api,
    links: {
      consumeCode: async () => ({}),
      unlinkTelegram: async () => ({ ok: true }),
      ...overrides.links,
    },
    updates: overrides.updates || {},
    previewAiLimit: overrides.previewAiLimit || (async () => ({ allowed: true })),
    consumeAiRequest: overrides.consumeAiRequest || (async () => ({ allowed: true })),
    generateDraft:
      overrides.generateDraft ||
      (async () => ({
        title: "Купить хлеб",
        date: "",
        priority: "⚡️ P2",
        energyLevel: "med",
        category: "Личное",
      })),
    answerAi: overrides.answerAi || (async () => "Спокойный ответ Glowy"),
    createTask: overrides.createTask,
    completeTask: overrides.completeTask,
    miniAppUrls:
      overrides.miniAppUrls ||
      { build: (target = "home") => `https://dev.glowy-ai.ru/telegram?target=${target}` },
    now: overrides.now || (() => new Date("2026-08-26T12:00:00.000Z")),
  });
