import axios from "axios";
import {
  schemaUserPreferences,
  schemaTelegramConnectionStatus,
  schemaTelegramLinkCode,
  type TelegramConnectionStatus,
  type TelegramLinkCode,
  type UserPreferences,
  type UserPreferencesPatch,
  type UserProgress,
} from "../types";
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

  async getPreferences(): Promise<UserPreferences> {
    const response = await api.get("/preferences");
    return schemaUserPreferences.parse(response.data);
  },

  async updatePreferences(
    preferences: UserPreferencesPatch
  ): Promise<UserPreferences> {
    const response = await api.patch("/preferences", preferences);
    return schemaUserPreferences.parse(response.data);
  },

  async deleteAccount(password: string): Promise<{ ok: true }> {
    const response = await api.delete("/account", { data: { password } });
    return response.data;
  },

  async getTelegramConnection(): Promise<TelegramConnectionStatus> {
    const response = await api.get("/telegram");
    return schemaTelegramConnectionStatus.parse(response.data);
  },

  async createTelegramLinkCode(): Promise<TelegramLinkCode> {
    const response = await api.post("/telegram/link-code");
    return schemaTelegramLinkCode.parse(response.data);
  },

  async unlinkTelegram(): Promise<{ ok: true }> {
    const response = await api.delete("/telegram");
    return response.data;
  },
};
