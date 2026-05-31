import axios from "axios";
import type { UserProgress } from "../types";
import { useAuthStore } from "../store/useAuthStore";

const url = "https://glowy-backend.onrender.com/api/user";

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

export const UserApi = {
  async getProgress(): Promise<UserProgress> {
    const response = await api.get("/progress");
    return response.data;
  },
};
