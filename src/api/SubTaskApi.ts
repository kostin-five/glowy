import axios from "axios";
import {
  subTaskCreateRequestSchema,
  subTaskSchema,
  subTaskUpdateRequestSchema,
  taskDeleteResponseSchema,
} from "@glowy/contracts";
import { useAuthStore } from "../store/useAuthStore";
import type { SubTask } from "../types";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: `${API_BASE_URL}/subtasks`,
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

export const SubTaskApi = {
  async fetchSubTasks(taskId: number): Promise<SubTask[]> {
    const response = await api.get(`/${taskId}`);
    return subTaskSchema.array().parse(response.data);
  },

  async createSubTask(taskId: number, title: string): Promise<SubTask> {
    const response = await api.post(
      "/",
      subTaskCreateRequestSchema.parse({ taskId, title })
    );
    return subTaskSchema.parse(response.data);
  },

  async toggleSubTask(id: number, completed: boolean): Promise<SubTask> {
    const response = await api.put(
      `/${id}`,
      subTaskUpdateRequestSchema.parse({ completed })
    );
    return subTaskSchema.parse(response.data);
  },

  async updateSubTask(
    id: number,
    data: Partial<Pick<SubTask, "title" | "completed" | "position">>
  ): Promise<SubTask> {
    const response = await api.put(
      `/${id}`,
      subTaskUpdateRequestSchema.parse(data)
    );
    return subTaskSchema.parse(response.data);
  },

  async deleteSubTask(id: number) {
    const response = await api.delete(`/${id}`);
    return taskDeleteResponseSchema.parse(response.data);
  },
};
