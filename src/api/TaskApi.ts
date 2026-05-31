import axios from "axios";
import type { Task, TaskDraft, UserProgress } from "../types";
import { useAuthStore } from "../store/useAuthStore";

const url = "https://glowy-backend.onrender.com/api/tasks";

const api = axios.create({
  baseURL: url,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export interface TaskUpdateResponse {
  task: Task;
  xpReward: number;
  userProgress: UserProgress | null;
}

export const TaskApi = {
  async getTasks(): Promise<Task[]> {
    const response = await api.get("/");
    return response.data;
  },

  async postTask(data: TaskDraft): Promise<Task> {
    const response = await api.post("/", data);
    return response.data;
  },

  async putTask(
    id: number,
    data: Partial<Task>
  ): Promise<TaskUpdateResponse | Task> {
    const response = await api.put(`/${id}`, data);
    return response.data;
  },

  async deleteTask(id: number) {
    const response = await api.delete(`/${id}`);
    return response.data;
  },
};
