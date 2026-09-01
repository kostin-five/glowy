import axios from "axios";
import {
  aiLimitErrorSchema,
  aiUsageSchema,
  mindHubResponseSchema,
  type AiUsage,
  type MindHubMessage,
  type MindHubMode,
  type MindHubResponse,
} from "@glowy/contracts";
import { useAuthStore } from "../store/useAuthStore";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";
import { trackProductEventOnce } from "../utils/analytics";

export type {
  AiUsage,
  MindHubDraft,
  MindHubLimit,
  MindHubMessage,
  MindHubMode,
  MindHubResponse,
} from "@glowy/contracts";

const aiInstance = axios.create({
  baseURL: `${API_BASE_URL}/ai`,
  withCredentials: true,
});

const getGuestRegistrationResponse = (): MindHubResponse => ({
  drafts: [],
  reply: "Чтобы пользоваться Glowy AI, зарегистрируйся или войди в аккаунт.",
});

aiInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

attachUnauthorizedInterceptor(aiInstance);

export default class AiApi {
  static async getAiUsage(): Promise<AiUsage | null> {
    try {
      const response = await aiInstance.get("/usage");
      return aiUsageSchema.parse(response.data);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  static async getAdvice() {
    try {
      const response = await aiInstance.post("/analyze");
      return response.data;
    } catch (e) {
      console.error(e);
      return { message: "Glowy сейчас отдыхает, попробуй позже" };
    }
  }

  static async parseMindHub(
    message: string,
    hubMode: MindHubMode = "auto",
    messages: MindHubMessage[] = []
  ): Promise<MindHubResponse> {
    const authStore = useAuthStore.getState();

    if (authStore.isGuest) {
      return getGuestRegistrationResponse();
    }

    try {
      const response = await aiInstance.post("/mind-hub", {
        message,
        hubMode,
        messages,
        currentEnergy: authStore.currentEnergy,
      });
      if (authStore.isAuthenticated && !authStore.isGuest) {
        trackProductEventOnce("first_ai_request");
      }
      return mindHubResponseSchema.parse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const limitError = aiLimitErrorSchema.safeParse(error.response.data);
        return {
          drafts: [],
          reply: error.response.data?.error ?? "Лимит запросов исчерпан.",
          limit: limitError.success ? limitError.data.limit : undefined,
        };
      }

      throw error;
    }
  }
}
