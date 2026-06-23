import axios from "axios";
import type { UserProgress } from "../types";
import { useAuthStore } from "../store/useAuthStore";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: `${API_BASE_URL}/user`,
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

export const UserApi = {
  async getProgress(): Promise<UserProgress> {
    const response = await api.get("/progress");
    return response.data;
  },
};
