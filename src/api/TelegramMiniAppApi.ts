import axios from "axios";
import type { AiTone, AvatarId } from "../types";
import { API_BASE_URL } from "./config";

export type TelegramMiniAppUser = {
  id: number;
  name: string;
  email: string;
  xp: number;
  level: number;
  avatarId?: AvatarId | null;
  aiTone?: AiTone | null;
};

const api = axios.create({
  baseURL: `${API_BASE_URL}/telegram/mini-app`,
  withCredentials: true,
});

export const TelegramMiniAppApi = {
  async restore(initData: string, signal?: AbortSignal) {
    const response = await api.post<TelegramMiniAppUser>(
      "/session",
      { initData },
      { signal }
    );
    return response.data;
  },

  async register(
    data: { initData: string; name: string; email: string; password: string },
    signal?: AbortSignal
  ) {
    const response = await api.post<TelegramMiniAppUser>("/register", data, {
      signal,
    });
    return response.data;
  },

  async login(
    data: { initData: string; email: string; password: string },
    signal?: AbortSignal
  ) {
    const response = await api.post<TelegramMiniAppUser>("/login", data, {
      signal,
    });
    return response.data;
  },
};
