import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthStore {
  isAuthenticated: boolean;
  userName: string | null;
  token: string | null;
  login: (name: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userName: null,
      token: null,
      login: (name: string, token: string) =>
        set(() => ({
          isAuthenticated: true,
          userName: name,
          token: token,
        })),
      logout: () =>
        set(() => ({
          isAuthenticated: false,
          userName: null,
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
export const useUserName = () => useAuthStore((state) => state.userName);
export const useLogin = () => useAuthStore((state) => state.login);
export const useLogout = () => useAuthStore((state) => state.logout);
export const useToken = () => useAuthStore((state) => state.token);
