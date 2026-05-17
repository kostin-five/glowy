import axios from "axios";
import type { Task } from "../types";
import { useAuthStore } from "../store/useAuthStore";

const url = "http://localhost:3000/api/tasks";

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

export const TaskApi = {
  async getTasks() {
    const response = await api.get("/");
    return response.data;
  },

  async postTask(data: Task) {
    const response = await api.post("/", data);
    return response.data;
  },

  async putTask(id: number, data: Task) {
    const response = await api.put(`/${id}`, data);
    return response.data;
  },

  async deleteTask(id: number) {
    const response = await api.delete(`/${id}`);
    return response.data;
  },
};
