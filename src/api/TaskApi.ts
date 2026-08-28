import axios from "axios";
import { schemaTaskUpdateResponse } from "../types";
import type { Task, TaskDraft, TaskUpdateResponse } from "../types";
import { useAuthStore } from "../store/useAuthStore";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: `${API_BASE_URL}/tasks`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

attachUnauthorizedInterceptor(api);

export const TaskApi = {
  async getTasks(): Promise<Task[]> {
    const response = await api.get("");

    if (!Array.isArray(response.data)) {
      throw new Error("Сервер вернул некорректный список задач");
    }

    return response.data;
  },

  async postTask(data: TaskDraft): Promise<Task> {
    const response = await api.post("", data);
    return response.data;
  },

  async putTask(
    id: number,
    data: Partial<Task>
  ): Promise<TaskUpdateResponse | Task> {
    const response = await api.put(`/${id}`, data);
    if (response.data && typeof response.data === "object" && "task" in response.data) {
      return schemaTaskUpdateResponse.parse(response.data);
    }
    return response.data;
  },

  async deleteTask(id: number) {
    const response = await api.delete(`/${id}`);
    return response.data;
  },
};
