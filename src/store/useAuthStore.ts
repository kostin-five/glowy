import axios from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const GUEST_REQUEST_LIMIT = 7;
const GUEST_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;

const isGuestRequestWindowExpired = (resetDate: string | null) => {
  if (!resetDate) return true;

  const resetTime = new Date(resetDate).getTime();
  if (Number.isNaN(resetTime)) return true;

  return Date.now() - resetTime >= GUEST_REQUEST_WINDOW_MS;
};

interface AuthStore {
  isAuthenticated: boolean;
  isGuest: boolean;
  name: string;
  login: string | null;
  token: string | null;
  guestRequestsCount: number;
  guestRequestsResetDate: string | null;
  toLogin: (name: string, login: string, token: string) => void;
  restoreAuthSession: () => void;
  toDemoLogin: () => void;
  toLogout: () => void;
  consumeGuestRequest: () => boolean;
  resetGuestRequests: () => void;
  resetGuestRequestsIfNeeded: () => void;
  markGuestRequestsLimitReached: () => void;
  currentEnergy: number;
  updateCurrentEnergy: (energy: number) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isGuest: false,
      name: "",
      login: null,
      token: null,
      guestRequestsCount: 0,
      guestRequestsResetDate: null,
      toLogin: (name: string, login: string, token: string) =>
        set(() => ({
          isAuthenticated: true,
          isGuest: false,
          name: name,
          login: login,
          token: token,
        })),
      restoreAuthSession: () =>
        set((state) => {
          if (!state.token) return state;

          return {
            isAuthenticated: true,
            isGuest: state.token.startsWith("demo-token-"),
          };
        }),
      toDemoLogin: () =>
        set(() => ({
          isAuthenticated: true,
          isGuest: true,
          name: "Демо",
          login: "demo",
          token: `demo-token-${Date.now()}`,
          currentEnergy: 100,
        })),
      toLogout: () =>
        set(() => ({
          isAuthenticated: false,
          isGuest: false,
          name: "",
          login: null,
          token: null,
        })),
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

      updateCurrentEnergy: async (energy: number) => {
        try {
          const normalizedEnergy = Math.min(100, Math.max(0, energy));

          set(() => ({
            currentEnergy: normalizedEnergy,
          }));
          if (get().isGuest) return;

          await axios.put(
            "https://glowy-backend.onrender.com/api/user/energy",
            {
              currentEnergy: normalizedEnergy,
            },
            { headers: { Authorization: `Bearer ${get().token}` } }
          );
        } catch (e) {
          console.error(e);
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useIsGuest = () => useAuthStore((state) => state.isGuest);
export const useName = () => useAuthStore((state) => state.name);
export const useLogin = () => useAuthStore((state) => state.login);
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

export const useCurrentEnergy = () =>
  useAuthStore((state) => state.currentEnergy);
export const useUpdateCurrentEnergy = () =>
  useAuthStore((state) => state.updateCurrentEnergy);
