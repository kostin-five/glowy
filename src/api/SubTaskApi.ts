import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

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
  async fetchSubTasks(taskId: number) {
    const response = await api.get(`/subtask/${taskId}`);
    return response.data;
  },

  async createSubTask(taskId: number, title: string) {
    const response = await api.post("/subtask", { taskId, title });
    return response.data;
  },

  async toggleSubTask(id: number, completed: boolean) {
    const response = await api.put(`/subtask/${id}`, { completed });
    return response.data;
  },

  async deleteTask(id: number) {
    const response = await api.delete(`/subtask/${id}`);
    return response.data;
  },
};
