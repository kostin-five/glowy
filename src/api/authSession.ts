import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";

const AUTH_STORAGE_KEY = "auth-storage";
const LEGACY_TOKEN_KEYS = ["token", "jwt", "accessToken", "authToken"];
let isRedirectingToLogin = false;

const isDemoToken = (token: string | null | undefined) =>
  Boolean(token?.startsWith("demo-token-"));

export const hasLegacyAuthToken = () => {
  const token = useAuthStore.getState().token;

  if (token && !isDemoToken(token)) return true;

  try {
    return LEGACY_TOKEN_KEYS.some((key) => Boolean(localStorage.getItem(key)));
  } catch {
    return false;
  }
};

export const clearLocalAuthSession = () => {
  useAuthStore.getState().toLogout();
  useTaskStore.getState().setTasks([]);
  useTaskStore.getState().setUserProgress({ xp: 0, level: 1 });

  try {
    LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("glowy-tasks");

    const rawStorage = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawStorage) return;

    const parsedStorage = JSON.parse(rawStorage) as {
      state?: Record<string, unknown>;
      version?: number;
    };

    if (!parsedStorage.state) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    parsedStorage.state = {
      ...parsedStorage.state,
      isAuthenticated: false,
      isGuest: false,
      name: "",
      email: null,
      token: null,
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsedStorage));
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const redirectToLogin = () => {
  if (typeof window === "undefined" || isRedirectingToLogin) return;

  isRedirectingToLogin = true;

  if (window.location.pathname === "/login") {
    isRedirectingToLogin = false;
    return;
  }

  window.location.assign("/login");
};

export const handleUnauthorizedSession = () => {
  clearLocalAuthSession();
  redirectToLogin();
};

axios.defaults.withCredentials = true;
