import axios from "axios";
import type { Task } from "../types";
import { useAuthStore } from "../store/useAuthStore";
const url = "https://glowy-backend.onrender.com/api/ai";

const aiInstance = axios.create({
  baseURL: url,
});

const splitGuestThoughts = (message: string) =>
  message
    .split(/[\n,;]+|(?:\s+и\s+)/i)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseGuestMindHub = (message: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = splitGuestThoughts(message).map<Task>((title, index) => ({
    id: Date.now() + index,
    title,
    date: today,
    priority: "⚡️ P2",
    category: "Быт",
    completed: false,
    xpAwarded: false,
    energyLevel: "med",
    subtasks: [],
  }));

  return {
    tasks,
    reply: tasks.length
      ? null
      : "Я рядом. Напиши одну или несколько конкретных мыслей, и я превращу их в задачи.",
  };
};

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

  static async parseMindHub(message: string): Promise<{
    tasks: Task[];
    reply: string | null;
  }> {
    if (useAuthStore.getState().isGuest) {
      return parseGuestMindHub(message);
    }

    const response = await aiInstance.post("/mind-hub", { message });
    return response.data;
  }
}
