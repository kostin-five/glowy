import axios from "axios";
import type { Task } from "../types";
import { useAuthStore } from "../store/useAuthStore";
const url = "https://glowy-backend.onrender.com/api/ai";

export type MindHubMode = "chat" | "parse";
export type MindHubMessage = {
  role: "user" | "assistant";
  text: string;
};

const aiInstance = axios.create({
  baseURL: url,
});

const GUEST_LIMIT_REPLY =
  "Упс, твои демо-запросы на сегодня всё! 🐣 Зарегистрируйся бесплатно, чтобы сохранить свои задачи и общаться со мной без ограничений.";

const getGuestLimitResponse = () => ({
  tasks: [],
  reply: GUEST_LIMIT_REPLY,
});

const normalizeGuestMindHubTasks = (tasks: Partial<Task>[]): Task[] =>
  tasks
    .map((task, index) => ({
      id: Date.now() + index,
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
      subtasks: [],
    }))
    .filter((task) => task.title.trim().length > 0);

aiInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
  ): Promise<{
    tasks: Task[];
    reply: string | null;
  }> {
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
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          useAuthStore.getState().markGuestRequestsLimitReached();
          return getGuestLimitResponse();
        }

        throw error;
      }
    }

    const response = await aiInstance.post("/mind-hub", {
      message,
      hubMode,
      messages,
    });
    return response.data;
  }
}
