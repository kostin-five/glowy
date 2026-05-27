import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import type { SubTask } from "../types";

const url = "https://glowy-backend.onrender.com/api/subtasks";

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

export const SubTaskApi = {
  async fetchSubTasks(taskId: number): Promise<SubTask[]> {
    const response = await api.get(`/${taskId}`);
    return response.data;
  },

  async createSubTask(taskId: number, title: string): Promise<SubTask> {
    const response = await api.post("/", { taskId, title });
    return response.data;
  },

  async toggleSubTask(id: number, completed: boolean): Promise<SubTask> {
    const response = await api.put(`/${id}`, { completed });
    return response.data;
  },

  async deleteSubTask(id: number) {
    const response = await api.delete(`/${id}`);
    return response.data;
  },
};
