import axios from "axios";
import type { Task } from "../types";
import { useAuthStore } from "../store/useAuthStore";
const url = "https://glowy-backend.onrender.com/api/ai";

const aiInstance = axios.create({
  baseURL: url,
});

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
    const response = await aiInstance.post("/mind-hub", { message });
    return response.data;
  }
}
