import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthStore {
  isAuthenticated: boolean;
  name: string;
  login: string | null;
  token: string | null;
  toLogin: (name: string, token: string) => void;
  toLogout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      name: "",
      login: null,
      token: null,
      toLogin: (login: string, token: string) =>
        set(() => ({
          isAuthenticated: true,
          login: login,
          token: token,
        })),
      toLogout: () =>
        set(() => ({
          isAuthenticated: false,
          login: null,
          token: null,
        })),
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
