import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TaskViewMode = "list" | "grid";
export type ThemeMode = "light" | "dark" | "system";
export type StartRoute = "/dashboard" | "/tasks";

interface SettingsStore {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  taskViewMode: TaskViewMode;
  startRoute: StartRoute;
  dailyEnergyLimit: number;
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setTaskViewMode: (taskViewMode: TaskViewMode) => void;
  setStartRoute: (startRoute: StartRoute) => void;
  setDailyEnergyLimit: (dailyEnergyLimit: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isDarkMode: true,
      themeMode: "dark",
      taskViewMode: "list",
      startRoute: "/dashboard",
      dailyEnergyLimit: 100,
      toggleDarkMode: () =>
        set((state) => ({
          isDarkMode: !state.isDarkMode,
          themeMode: state.isDarkMode ? "light" : "dark",
        })),
      setDarkMode: (isDarkMode: boolean) => set(() => ({ isDarkMode })),
      setThemeMode: (themeMode: ThemeMode) =>
        set((state) => ({
          themeMode,
          isDarkMode:
            themeMode === "system" ? state.isDarkMode : themeMode === "dark",
        })),
      setTaskViewMode: (taskViewMode: TaskViewMode) =>
        set(() => ({ taskViewMode })),
      setStartRoute: (startRoute: StartRoute) => set(() => ({ startRoute })),
      setDailyEnergyLimit: (dailyEnergyLimit: number) =>
        set(() => ({
          dailyEnergyLimit: Math.min(100, Math.max(0, dailyEnergyLimit)),
        })),
    }),
    {
      name: "glowy-settings",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsStore> | undefined;
        const legacyThemeMode =
          persisted?.isDarkMode === false ? "light" : "dark";

        return {
          ...currentState,
          ...persisted,
          themeMode: persisted?.themeMode ?? legacyThemeMode,
          startRoute: persisted?.startRoute ?? currentState.startRoute,
          dailyEnergyLimit:
            persisted?.dailyEnergyLimit ?? currentState.dailyEnergyLimit,
        };
      },
    }
  )
);

export const useIsDarkMode = () =>
  useSettingsStore((state) => state.isDarkMode);
export const useToggleDarkMode = () =>
  useSettingsStore((state) => state.toggleDarkMode);
export const useSetDarkMode = () =>
  useSettingsStore((state) => state.setDarkMode);
export const useThemeMode = () => useSettingsStore((state) => state.themeMode);
export const useSetThemeMode = () =>
  useSettingsStore((state) => state.setThemeMode);
export const useTaskViewMode = () =>
  useSettingsStore((state) => state.taskViewMode);
export const useSetTaskViewMode = () =>
  useSettingsStore((state) => state.setTaskViewMode);
export const useStartRoute = () =>
  useSettingsStore((state) => state.startRoute);
export const useSetStartRoute = () =>
  useSettingsStore((state) => state.setStartRoute);
export const useDailyEnergyLimit = () =>
  useSettingsStore((state) => state.dailyEnergyLimit);
export const useSetDailyEnergyLimit = () =>
  useSettingsStore((state) => state.setDailyEnergyLimit);
