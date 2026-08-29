import axios from "axios";
import {
  schemaAnalyticsInsight,
  schemaAnalyticsSnapshot,
  type AnalyticsInsight,
  type AnalyticsSnapshot,
} from "../types";
import { useAuthStore } from "../store/useAuthStore";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";

const api = axios.create({
  baseURL: `${API_BASE_URL}/analytics`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

attachUnauthorizedInterceptor(api);

export type AnalyticsPeriodKind = "week" | "month";

export const AnalyticsApi = {
  async getSnapshot(
    period: AnalyticsPeriodKind,
    anchor: string
  ): Promise<AnalyticsSnapshot> {
    const response = await api.get("/", {
      params: { period, anchor, cacheBust: Date.now() },
    });
    return schemaAnalyticsSnapshot.parse(response.data);
  },

  async requestInsight(
    period: AnalyticsPeriodKind,
    anchor: string
  ): Promise<AnalyticsInsight> {
    const response = await api.post("/insight", { period, anchor });
    return schemaAnalyticsInsight.parse(response.data);
  },
};
