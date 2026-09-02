import { createTelegramWorker } from "../services/telegram/telegram-worker.service.js";

type WorkerOptions = NonNullable<Parameters<typeof createTelegramWorker>[0]>;
type RelaxedFunction<FunctionType> = FunctionType extends (
  ...args: infer Args
) => unknown
  ? (...args: Args) => unknown
  : never;
type WorkerFixtureOptions = {
  db: unknown;
  api: unknown;
  links?: Record<string, unknown>;
  updates?: unknown;
  reserveAiRequest?: RelaxedFunction<NonNullable<WorkerOptions["reserveAiRequest"]>>;
  releaseAiRequest?: RelaxedFunction<NonNullable<WorkerOptions["releaseAiRequest"]>>;
  generateDraft?: RelaxedFunction<NonNullable<WorkerOptions["generateDraft"]>>;
  answerAi?: RelaxedFunction<NonNullable<WorkerOptions["answerAi"]>>;
  createTask?: RelaxedFunction<NonNullable<WorkerOptions["createTask"]>>;
  completeTask?: RelaxedFunction<NonNullable<WorkerOptions["completeTask"]>>;
  miniAppUrls?: { build: (target?: string) => string };
  now?: () => Date;
  timeZone?: string;
  pollIntervalMs?: number;
};
type TelegramMessageOverrides = Record<string, unknown>;
type ApiPayload = Record<string, unknown>;
interface RecordedButton extends Record<string, unknown> {
  text: string;
  callback_data: string;
  web_app: { url: string };
}
interface RecordedApiPayload extends Record<string, unknown> {
  text: string;
  reply_markup: { inline_keyboard: RecordedButton[][] };
}
type ApiCall = [method: string, payload: RecordedApiPayload];
interface ApiCallLog extends Array<ApiCall> {
  [index: number]: ApiCall;
}

export const linkedConnection = {
  id: 5,
  userId: 42,
  chatId: "1001",
  pendingCommand: null,
  pendingCommandExpiresAt: null,
};

export const messageUpdate = (value: TelegramMessageOverrides = {}) => ({
  update_id: 10,
  message: {
    message_id: 2,
    from: { id: 1001 },
    chat: { id: 1001, type: "private" },
    ...value,
  },
});

export const callbackUpdate = (data: string) => ({
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
  const calls = [] as unknown as ApiCallLog;
  return {
    calls,
    api: {
      sendMessage: async (payload: ApiPayload) => { calls.push(["sendMessage", payload as RecordedApiPayload]); return {}; },
      answerCallbackQuery: async (payload: ApiPayload) => { calls.push(["answerCallbackQuery", payload as RecordedApiPayload]); return true; },
      editMessageReplyMarkup: async (payload: ApiPayload) => { calls.push(["editMessageReplyMarkup", payload as RecordedApiPayload]); return true; },
    },
  };
};

export const createWorkerFixture = ({ db, api, ...overrides }: WorkerFixtureOptions) =>
  createTelegramWorker({
    db,
    api,
    links: {
      consumeCode: async () => ({}),
      unlinkTelegram: async () => ({ ok: true }),
      ...overrides.links,
    },
    updates: overrides.updates || {},
    reserveAiRequest:
      overrides.reserveAiRequest ||
      (async (userId: number) => ({
        allowed: true,
        reservation: {
          userId,
          cost: 1,
          resetAt: "2026-08-27T12:00:00.000Z",
        },
      })),
    releaseAiRequest:
      overrides.releaseAiRequest || (async () => ({ released: true })),
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
  } as unknown as WorkerOptions);
