import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  schemaHabit,
  schemaProgressOverview,
  type Habit,
  type ProgressOverview,
} from "../types";
import { API_BASE_URL } from "./config";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";

const api = axios.create({
  baseURL: `${API_BASE_URL}/progress`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

attachUnauthorizedInterceptor(api);

export const ProgressApi = {
  async getOverview(
    today: string,
    month?: string,
    signal?: AbortSignal
  ): Promise<ProgressOverview> {
    const response = await api.get("", { params: { today, month }, signal });
    return schemaProgressOverview.parse(response.data);
  },

  async applyRescue(
    protectedOn: string,
    today: string,
    month?: string
  ): Promise<ProgressOverview> {
    const response = await api.post("/rescues", { protectedOn, today, month });
    return schemaProgressOverview.parse(response.data);
  },

  async createHabit(title: string, today: string): Promise<Habit> {
    const response = await api.post("/habits", { title, today });
    return schemaHabit.parse(response.data);
  },

  async archiveHabit(id: number, today: string): Promise<Habit> {
    const response = await api.patch(`/habits/${id}`, {
      archived: true,
      today,
    });
    return schemaHabit.parse(response.data);
  },

  async updateHabit(id: number, title: string, today: string): Promise<Habit> {
    const response = await api.patch(`/habits/${id}`, { title, today });
    return schemaHabit.parse(response.data);
  },

  async restoreHabit(id: number, today: string): Promise<Habit> {
    const response = await api.patch(`/habits/${id}`, {
      archived: false,
      today,
    });
    return schemaHabit.parse(response.data);
  },

  async deleteHabit(id: number): Promise<void> {
    await api.delete(`/habits/${id}`);
  },

  async setHabitCompleted(
    id: number,
    date: string,
    completed: boolean,
    today: string
  ): Promise<Habit> {
    if (completed) {
      const response = await api.put(`/habits/${id}/checks/${date}`, null, {
        params: { today },
      });
      return schemaHabit.parse(response.data);
    }

    const response = await api.delete(`/habits/${id}/checks/${date}`, {
      params: { today },
    });
    return schemaHabit.parse(response.data);
  },
};
