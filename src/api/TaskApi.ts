import axios from "axios";
import {
  taskCreateRequestSchema,
  taskDeleteResponseSchema,
  taskSchema,
  taskUpdateRequestSchema,
  taskUpdateResponseSchema,
} from "@glowy/contracts";
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

    return taskSchema.array().parse(response.data);
  },

  async postTask(data: TaskDraft): Promise<Task> {
    const response = await api.post("", taskCreateRequestSchema.parse(data));
    return taskSchema.parse(response.data);
  },

  async putTask(
    id: number,
    data: Partial<Task>
  ): Promise<TaskUpdateResponse | Task> {
    const response = await api.put(`/${id}`, taskUpdateRequestSchema.parse(data));
    if (response.data && typeof response.data === "object" && "task" in response.data) {
      return taskUpdateResponseSchema.parse(response.data);
    }
    return taskSchema.parse(response.data);
  },

  async deleteTask(id: number) {
    const response = await api.delete(`/${id}`);
    return taskDeleteResponseSchema.parse(response.data);
  },
};
