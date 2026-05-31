import axios from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthStore {
  isAuthenticated: boolean;
  isGuest: boolean;
  name: string;
  login: string | null;
  token: string | null;
  toLogin: (name: string, login: string, token: string) => void;
  toDemoLogin: () => void;
  toLogout: () => void;
  energyLimit: number;
  energyDate: string;
  updateEnergyLimit: (limit: number) => Promise<void>;
  checkAndResetEnergy: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isGuest: false,
      name: "",
      login: null,
      token: null,
      toLogin: (name: string, login: string, token: string) =>
        set(() => ({
          isAuthenticated: true,
          isGuest: false,
          name: name,
          login: login,
          token: token,
        })),
      toDemoLogin: () =>
        set(() => ({
          isAuthenticated: true,
          isGuest: true,
          name: "Демо",
          login: "demo",
          token: `demo-token-${Date.now()}`,
          energyLimit: 80,
          energyDate: new Date().toISOString().slice(0, 10),
        })),
      toLogout: () =>
        set(() => ({
          isAuthenticated: false,
          isGuest: false,
          name: "",
          login: null,
          token: null,
        })),
      energyLimit: 100,
      energyDate: "",

      updateEnergyLimit: async (limit: number) => {
        try {
          set(() => ({
            energyLimit: limit,
            energyDate: new Date().toISOString().slice(0, 10),
          }));
          if (get().isGuest) return;

          await axios.put(
            "https://glowy-backend.onrender.com/api/user/energy",
            {
              energyLimit: limit,
            },
            { headers: { Authorization: `Bearer ${get().token}` } }
          );
        } catch (e) {
          console.error(e);
        }
      },
      checkAndResetEnergy: () => {
        const today = new Date().toISOString().slice(0, 10);
        const { isAuthenticated, energyDate, updateEnergyLimit } = get();

        if (!isAuthenticated || !energyDate || energyDate !== today) {
          updateEnergyLimit(100);
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
export const useToDemoLogin = () =>
  useAuthStore((state) => state.toDemoLogin);
export const useToLogout = () => useAuthStore((state) => state.toLogout);
export const useToken = () => useAuthStore((state) => state.token);

export const useEnergyDate = () => useAuthStore((state) => state.energyDate);
export const useEnergyLimit = () => useAuthStore((state) => state.energyLimit);
export const useUpdateEnergyLimit = () =>
  useAuthStore((state) => state.updateEnergyLimit);
export const useCheckAndResetEnergy = () =>
  useAuthStore((state) => state.checkAndResetEnergy);
