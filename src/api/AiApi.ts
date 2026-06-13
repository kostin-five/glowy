import axios from "axios";
import type { Task } from "../types";
import { GUEST_REQUEST_LIMIT, useAuthStore } from "../store/useAuthStore";
import { attachUnauthorizedInterceptor } from "./authSession";
const url = "https://glowy-backend.onrender.com/api/ai";

export type MindHubMode = "chat" | "parse";
export type MindHubMessage = {
  role: "user" | "assistant";
  text: string;
};
export type MindHubLimit = {
  limit: number;
  remaining: number;
  resetAt: string | null;
};

export type MindHubResponse = {
  tasks: Task[];
  reply: string | null;
  limit?: MindHubLimit;
};

const aiInstance = axios.create({
  baseURL: url,
  withCredentials: true,
});

const GUEST_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const GUEST_LIMIT_REPLY =
  "Упс, твои демо-запросы на сегодня всё! 🐣 Зарегистрируйся бесплатно, чтобы сохранить свои задачи и общаться со мной без ограничений.";

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
  tasks: [],
  reply: GUEST_LIMIT_REPLY,
  limit: getGuestMindHubLimit(),
});

const normalizeGuestMindHubTasks = (tasks: Partial<Task>[]): Task[] =>
  tasks
    .map((task, index) => {
      const taskId = Date.now() + index;

      return {
        id: taskId,
        title: typeof task.title === "string" ? task.title : "",
        date:
          typeof task.date === "string"
            ? task.date
            : new Date().toISOString().slice(0, 10),
        priority: task.priority ?? "⚡️ P2",
        category: task.category ?? "Быт",
        completed: false,
        xpAwarded: false,
        energyLevel: task.energyLevel ?? "med",
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks
              .map((subtask, subtaskIndex) => ({
                id: taskId + subtaskIndex + 1,
                taskId,
                title:
                  typeof subtask?.title === "string"
                    ? subtask.title.trim()
                    : "",
                completed: Boolean(subtask?.completed),
                position:
                  typeof subtask?.position === "number"
                    ? subtask.position
                    : subtaskIndex,
              }))
              .filter((subtask) => subtask.title.length > 0)
          : [],
      };
    })
    .filter((task) => task.title.trim().length > 0);

aiInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

attachUnauthorizedInterceptor(aiInstance);

export default class AiApi {
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
    hubMode: MindHubMode = "parse",
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
        });

        return {
          tasks: normalizeGuestMindHubTasks(response.data.tasks ?? []),
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
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return {
          tasks: [],
          reply: error.response.data?.error ?? "Лимит запросов исчерпан.",
          limit: error.response.data?.limit,
        };
      }

      throw error;
    }
  }
}
