import axios from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { API_BASE_URL } from "../api/config";
import type { AiTone, AvatarId } from "../types";

export const GUEST_REQUEST_LIMIT = 3;
const GUEST_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
let authSessionVersion = 0;

const invalidatePendingAuthChecks = () => {
  authSessionVersion += 1;
};

const isGuestRequestWindowExpired = (resetDate: string | null) => {
  if (!resetDate) return true;

  const resetTime = new Date(resetDate).getTime();
  if (Number.isNaN(resetTime)) return true;

  return Date.now() - resetTime >= GUEST_REQUEST_WINDOW_MS;
};

interface AuthStore {
  isAuthenticated: boolean;
  isGuest: boolean;
  userId: number | null;
  name: string;
  email: string | null;
  avatarId: AvatarId;
  aiTone: AiTone;
  token: string | null;
  guestRequestsCount: number;
  guestRequestsResetDate: string | null;
  toLogin: (
    userId: number,
    name: string,
    email: string,
    token?: string | null
  ) => void;
  restoreAuthSession: () => void;
  toDemoLogin: () => void;
  toLogout: () => void;
  isChecking: boolean;
  checkAuth: () => Promise<void>;
  consumeGuestRequest: () => boolean;
  resetGuestRequests: () => void;
  resetGuestRequestsIfNeeded: () => void;
  markGuestRequestsLimitReached: () => void;
  currentEnergy: number;
  setProfilePreferences: (avatarId: AvatarId, aiTone: AiTone) => void;
  updateCurrentEnergy: (energy: number) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isGuest: false,
      userId: null,
      isChecking: true,
      name: "",
      email: null,
      avatarId: "orbit-indigo",
      aiTone: "calm",
      token: null,
      guestRequestsCount: 0,
      guestRequestsResetDate: null,
      toLogin: (
        userId: number,
        name: string,
        email: string,
        token: string | null = null
      ) => {
        invalidatePendingAuthChecks();
        set(() => ({
          isAuthenticated: true,
          isGuest: false,
          userId,
          isChecking: false,
          name: name,
          email: email,
          token: token,
        }));
      },
      restoreAuthSession: () =>
        set((state) => {
          if (state.token && state.token.startsWith("demo-token-")) {
            return {
              isAuthenticated: true,
              isGuest: true,
              isChecking: false,
            };
          }

          return state;
        }),
      toDemoLogin: () => {
        invalidatePendingAuthChecks();
        set(() => ({
          isAuthenticated: true,
          isGuest: true,
          userId: null,
          isChecking: false,
          name: "Демо",
          email: "demo",
          avatarId: "orbit-indigo",
          aiTone: "calm",
          token: `demo-token-${Date.now()}`,
          currentEnergy: 100,
        }));
      },
      toLogout: () => {
        invalidatePendingAuthChecks();
        set(() => ({
          isAuthenticated: false,
          isGuest: false,
          userId: null,
          isChecking: false,
          name: "",
          email: null,
          avatarId: "orbit-indigo",
          aiTone: "calm",
          token: null,
        }));
      },
      checkAuth: async () => {
        const requestSessionVersion = authSessionVersion;

        if (!navigator.onLine && get().userId !== null) {
          set({ isAuthenticated: true, isGuest: false, isChecking: false });
          return;
        }

        set({ isChecking: true });
        try {
          // Dynamic import to avoid circular dependency
          const { AuthApi } = await import("../api/AuthApi");
          const user = await AuthApi.meRequest();
          if (requestSessionVersion !== authSessionVersion) return;

          set({
            isAuthenticated: true,
            isGuest: false,
            userId: user.id,
            name: user.name,
            email: user.email,
            avatarId: user.avatarId || "orbit-indigo",
            aiTone: user.aiTone || "calm",
            isChecking: false,
          });
        } catch (error) {
          if (requestSessionVersion !== authSessionVersion) return;

          const canUseOfflineSession =
            get().userId !== null &&
            (!navigator.onLine ||
              (axios.isAxiosError(error) && !error.response));
          if (canUseOfflineSession) {
            set({ isAuthenticated: true, isGuest: false, isChecking: false });
            return;
          }

          set({
            isAuthenticated: false,
            isGuest: false,
            userId: null,
            name: "",
            email: null,
            avatarId: "orbit-indigo",
            aiTone: "calm",
            token: null,
            isChecking: false,
          });
        }
      },
      consumeGuestRequest: () => {
        const { guestRequestsCount, guestRequestsResetDate } = get();

        if (isGuestRequestWindowExpired(guestRequestsResetDate)) {
          set(() => ({
            guestRequestsCount: 1,
            guestRequestsResetDate: new Date().toISOString(),
          }));
          return true;
        }

        if (guestRequestsCount >= GUEST_REQUEST_LIMIT) return false;

        set(() => ({
          guestRequestsCount: guestRequestsCount + 1,
          guestRequestsResetDate,
        }));
        return true;
      },
      resetGuestRequests: () =>
        set(() => ({
          guestRequestsCount: 0,
          guestRequestsResetDate: null,
        })),
      resetGuestRequestsIfNeeded: () => {
        if (!isGuestRequestWindowExpired(get().guestRequestsResetDate)) return;

        set(() => ({
          guestRequestsCount: 0,
          guestRequestsResetDate: null,
        }));
      },
      markGuestRequestsLimitReached: () =>
        set(() => ({
          guestRequestsCount: GUEST_REQUEST_LIMIT,
          guestRequestsResetDate:
            get().guestRequestsResetDate || new Date().toISOString(),
        })),
      currentEnergy: 100,
      setProfilePreferences: (avatarId, aiTone) => set({ avatarId, aiTone }),

      updateCurrentEnergy: async (energy: number) => {
        try {
          const normalizedEnergy = Math.min(100, Math.max(0, energy));

          set(() => ({
            currentEnergy: normalizedEnergy,
          }));
          if (get().isGuest) return;

          await axios.put(
            `${API_BASE_URL}/user/energy`,
            {
              currentEnergy: normalizedEnergy,
            },
            {
              withCredentials: true,
              headers: get().token
                ? { Authorization: `Bearer ${get().token}` }
                : undefined,
            }
          );
        } catch (e) {
          console.error(e);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthStore> & {
          login?: string | null;
        };

        if (!state.email && state.login) {
          state.email = state.login;
        }

        delete state.login;
        return state;
      },
    }
  )
);

export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useIsGuest = () => useAuthStore((state) => state.isGuest);
export const useName = () => useAuthStore((state) => state.name);
export const useEmail = () => useAuthStore((state) => state.email);
export const useAvatarId = () => useAuthStore((state) => state.avatarId);
export const useAiTone = () => useAuthStore((state) => state.aiTone);
export const useToLogin = () => useAuthStore((state) => state.toLogin);
export const useRestoreAuthSession = () =>
  useAuthStore((state) => state.restoreAuthSession);
export const useToDemoLogin = () =>
  useAuthStore((state) => state.toDemoLogin);
export const useToLogout = () => useAuthStore((state) => state.toLogout);
export const useToken = () => useAuthStore((state) => state.token);
export const useGuestRequestsCount = () =>
  useAuthStore((state) => state.guestRequestsCount);
export const useGuestRequestsResetDate = () =>
  useAuthStore((state) => state.guestRequestsResetDate);

export const useIsChecking = () => useAuthStore((state) => state.isChecking);
export const useCurrentEnergy = () =>
  useAuthStore((state) => state.currentEnergy);
export const useUpdateCurrentEnergy = () =>
  useAuthStore((state) => state.updateCurrentEnergy);
