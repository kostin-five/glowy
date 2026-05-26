import axios from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthStore {
  isAuthenticated: boolean;
  name: string;
  login: string | null;
  token: string | null;
  toLogin: (name: string, login: string, token: string) => void;
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
      name: "",
      login: null,
      token: null,
      toLogin: (name: string, login: string, token: string) =>
        set(() => ({
          isAuthenticated: true,
          name: name,
          login: login,
          token: token,
        })),
      toLogout: () =>
        set(() => ({
          isAuthenticated: false,
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
export const useName = () => useAuthStore((state) => state.name);
export const useLogin = () => useAuthStore((state) => state.login);
export const useToLogin = () => useAuthStore((state) => state.toLogin);
export const useToLogout = () => useAuthStore((state) => state.toLogout);
export const useToken = () => useAuthStore((state) => state.token);

export const useEnergyDate = () => useAuthStore((state) => state.energyDate);
export const useEnergyLimit = () => useAuthStore((state) => state.energyLimit);
export const useUpdateEnergyLimit = () =>
  useAuthStore((state) => state.updateEnergyLimit);
export const useCheckAndResetEnergy = () =>
  useAuthStore((state) => state.checkAndResetEnergy);
