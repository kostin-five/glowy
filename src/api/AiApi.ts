import axios from "axios";
import type { TaskDraft } from "../types";
import { GUEST_REQUEST_LIMIT, useAuthStore } from "../store/useAuthStore";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";
import { trackProductEventOnce } from "../utils/analytics";
import { normalizeTaskDate } from "../utils/taskDateGroups";

export type MindHubMode = "chat" | "parse" | "auto";
export type MindHubMessage = {
  role: "user" | "assistant";
  text: string;
};
export type MindHubLimit = {
  limit: number;
  remaining: number;
  resetAt: string | null;
};

export type AiUsage = {
  plan: "demo" | "start" | "focus" | "forever";
  used: number;
  limit: number;
  remaining: number;
};

export type MindHubResponse = {
  drafts: MindHubDraft[];
  reply: string | null;
  limit?: MindHubLimit;
};

export type MindHubDraft = TaskDraft;

const aiInstance = axios.create({
  baseURL: `${API_BASE_URL}/ai`,
  withCredentials: true,
});

const GUEST_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const GUEST_LIMIT_REPLY =
  "Демо-запросы на сегодня закончились. Зарегистрируйся бесплатно, чтобы сохранить задачи и получить больше запросов.";

const getGuestMindHubLimit = (): MindHubLimit => {
  const authStore = useAuthStore.getState();
  const resetAt = authStore.guestRequestsResetDate
    ? new Date(
        new Date(authStore.guestRequestsResetDate).getTime() +
          GUEST_REQUEST_WINDOW_MS
      ).toISOString()
    : null;

  return {
    limit: GUEST_REQUEST_LIMIT,
    remaining: Math.max(0, GUEST_REQUEST_LIMIT - authStore.guestRequestsCount),
    resetAt,
  };
};

const getGuestLimitResponse = (): MindHubResponse => ({
  drafts: [],
  reply: GUEST_LIMIT_REPLY,
  limit: getGuestMindHubLimit(),
});

const normalizeMindHubDrafts = (
  value: unknown
): MindHubDraft[] => {
  const drafts = Array.isArray(value)
    ? (value as Partial<MindHubDraft>[])
    : [];

  return drafts
    .map((draft) => ({
      title: typeof draft.title === "string" ? draft.title.trim() : "",
      date: normalizeTaskDate(draft.date),
      priority: ["🔥 P1", "⚡️ P2", "💤 P3"].includes(draft.priority ?? "")
        ? draft.priority!
        : "⚡️ P2",
      category:
        typeof draft.category === "string" && draft.category.trim()
          ? draft.category.trim()
          : "Быт",
      completed: false,
      energyLevel: ["low", "med", "high"].includes(draft.energyLevel ?? "")
        ? draft.energyLevel!
        : "med",
      subtasks: Array.isArray(draft.subtasks)
        ? draft.subtasks
            .map((subtask, subtaskIndex) => ({
              title:
                typeof subtask?.title === "string"
                  ? subtask.title.trim()
                  : "",
              completed: false,
              position: subtaskIndex,
            }))
            .filter((subtask) => subtask.title.length > 0)
        : [],
    }))
    .filter((draft) => draft.title.length > 0)
    .slice(0, 5);
};

aiInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

attachUnauthorizedInterceptor(aiInstance);

export default class AiApi {
  static async getAiUsage(): Promise<AiUsage | null> {
    try {
      const response = await aiInstance.get("/usage");
      return response.data as AiUsage;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  static async getAdvice() {
    try {
      const response = await aiInstance.post("/analyze");
      return response.data;
    } catch (e) {
      console.error(e);
      return { message: "Glowy сейчас отдыхает, попробуй позже" };
    }
  }

  static async parseMindHub(
    message: string,
    hubMode: MindHubMode = "auto",
    messages: MindHubMessage[] = []
  ): Promise<MindHubResponse> {
    const authStore = useAuthStore.getState();

    if (authStore.isGuest) {
      if (!authStore.consumeGuestRequest()) {
        return getGuestLimitResponse();
      }

      try {
        const response = await aiInstance.post("/mind-hub/public", {
          message,
          hubMode,
          messages,
          currentEnergy: authStore.currentEnergy,
        });

        return {
          drafts: normalizeMindHubDrafts(response.data.drafts ?? []),
          reply: response.data.reply ?? null,
          limit: getGuestMindHubLimit(),
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          useAuthStore.getState().markGuestRequestsLimitReached();
          return getGuestLimitResponse();
        }

        throw error;
      }
    }

    try {
      const response = await aiInstance.post("/mind-hub", {
        message,
        hubMode,
        messages,
        currentEnergy: authStore.currentEnergy,
      });
      if (authStore.isAuthenticated && !authStore.isGuest) {
        trackProductEventOnce("first_ai_request");
      }
      return {
        ...response.data,
        drafts: normalizeMindHubDrafts(response.data.drafts ?? []),
        reply:
          typeof response.data.reply === "string" ? response.data.reply : null,
      } as MindHubResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return {
          drafts: [],
          reply: error.response.data?.error ?? "Лимит запросов исчерпан.",
          limit: error.response.data?.limit,
        };
      }

      throw error;
    }
  }
}
