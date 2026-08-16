import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TaskViewMode = "list" | "grid";
export type ThemeMode = "light" | "dark" | "system";
export type StartRoute = "/dashboard" | "/tasks" | "/ai";
export type OnboardingHintId =
  | "taskCreation"
  | "progressNavigation"
  | "habitTracking"
  | "achievementDetails"
  | "analyticsPeriod"
  | "settingsNavigation";

interface SettingsStore {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  taskViewMode: TaskViewMode;
  startRoute: StartRoute;
  dailyEnergyLimit: number;
  shownOnboardingHints: OnboardingHintId[];
  isSidebarCollapsed: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setTaskViewMode: (taskViewMode: TaskViewMode) => void;
  setStartRoute: (startRoute: StartRoute) => void;
  setDailyEnergyLimit: (dailyEnergyLimit: number) => void;
  markOnboardingHintShown: (hintId: OnboardingHintId) => void;
  resetOnboardingHints: () => void;
  toggleSidebarCollapsed: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isDarkMode: true,
      themeMode: "dark",
      taskViewMode: "list",
      startRoute: "/dashboard",
      dailyEnergyLimit: 100,
      shownOnboardingHints: [],
      isSidebarCollapsed: false,
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
      markOnboardingHintShown: (hintId: OnboardingHintId) =>
        set((state) => ({
          shownOnboardingHints: state.shownOnboardingHints.includes(hintId)
            ? state.shownOnboardingHints
            : [...state.shownOnboardingHints, hintId],
        })),
      resetOnboardingHints: () => set({ shownOnboardingHints: [] }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
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
          shownOnboardingHints: Array.isArray(persisted?.shownOnboardingHints)
            ? persisted.shownOnboardingHints
            : currentState.shownOnboardingHints,
          isSidebarCollapsed:
            persisted?.isSidebarCollapsed ?? currentState.isSidebarCollapsed,
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
export const useWasOnboardingHintShown = (hintId: OnboardingHintId) =>
  useSettingsStore((state) =>
    state.shownOnboardingHints.includes(hintId)
  );
export const useMarkOnboardingHintShown = () =>
  useSettingsStore((state) => state.markOnboardingHintShown);
export const useResetOnboardingHints = () =>
  useSettingsStore((state) => state.resetOnboardingHints);
export const useIsSidebarCollapsed = () =>
  useSettingsStore((state) => state.isSidebarCollapsed);
export const useToggleSidebarCollapsed = () =>
  useSettingsStore((state) => state.toggleSidebarCollapsed);
