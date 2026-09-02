import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TaskViewMode = "list" | "grid";
export type ThemeMode = "light" | "dark" | "system";
export type StartRoute = "/dashboard" | "/tasks" | "/ai";
export type TaskFormMode = "compact" | "medium" | "full";
export type TaskFormField = "energy" | "priority";
export interface TaskFormPreferences {
  mode: TaskFormMode;
  fields: Record<TaskFormField, boolean>;
}
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
  taskFormPreferencesByAccount: Record<string, TaskFormPreferences>;
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setTaskViewMode: (taskViewMode: TaskViewMode) => void;
  setStartRoute: (startRoute: StartRoute) => void;
  setDailyEnergyLimit: (dailyEnergyLimit: number) => void;
  markOnboardingHintShown: (hintId: OnboardingHintId) => void;
  resetOnboardingHints: () => void;
  toggleSidebarCollapsed: () => void;
  setTaskFormMode: (accountScope: string, mode: TaskFormMode) => void;
  setTaskFormFieldVisible: (
    accountScope: string,
    field: TaskFormField,
    isVisible: boolean
  ) => void;
}

export const DEFAULT_TASK_FORM_PREFERENCES: TaskFormPreferences = {
  mode: "medium",
  fields: { energy: true, priority: true },
};

const isTaskFormMode = (value: unknown): value is TaskFormMode =>
  value === "compact" || value === "medium" || value === "full";

export const normalizeTaskFormPreferences = (
  value: unknown
): TaskFormPreferences => {
  if (!value || typeof value !== "object") {
    return DEFAULT_TASK_FORM_PREFERENCES;
  }

  const candidate = value as Partial<TaskFormPreferences>;
  const fields =
    candidate.fields && typeof candidate.fields === "object"
      ? candidate.fields
      : undefined;

  return {
    mode: isTaskFormMode(candidate.mode)
      ? candidate.mode
      : DEFAULT_TASK_FORM_PREFERENCES.mode,
    fields: {
      energy:
        typeof fields?.energy === "boolean"
          ? fields.energy
          : DEFAULT_TASK_FORM_PREFERENCES.fields.energy,
      priority:
        typeof fields?.priority === "boolean"
          ? fields.priority
          : DEFAULT_TASK_FORM_PREFERENCES.fields.priority,
    },
  };
};

const normalizeTaskFormPreferencesMap = (
  value: unknown
): Record<string, TaskFormPreferences> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([scope, preferences]) => [
      scope,
      normalizeTaskFormPreferences(preferences),
    ])
  );
};

export const getTaskFormPreferenceScope = (
  userId: number | null,
  isGuest: boolean
) => (userId !== null ? `user:${userId}` : isGuest ? "guest" : "anonymous");

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
      taskFormPreferencesByAccount: {},
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
      setTaskFormMode: (accountScope, mode) =>
        set((state) => ({
          taskFormPreferencesByAccount: {
            ...state.taskFormPreferencesByAccount,
            [accountScope]: {
              ...normalizeTaskFormPreferences(
                state.taskFormPreferencesByAccount[accountScope]
              ),
              mode,
            },
          },
        })),
      setTaskFormFieldVisible: (accountScope, field, isVisible) =>
        set((state) => {
          const preferences = normalizeTaskFormPreferences(
            state.taskFormPreferencesByAccount[accountScope]
          );

          return {
            taskFormPreferencesByAccount: {
              ...state.taskFormPreferencesByAccount,
              [accountScope]: {
                ...preferences,
                fields: {
                  ...preferences.fields,
                  [field]: isVisible,
                },
              },
            },
          };
        }),
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
          taskFormPreferencesByAccount: normalizeTaskFormPreferencesMap(
            persisted?.taskFormPreferencesByAccount
          ),
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
export const useTaskFormPreferences = (accountScope: string) =>
  useSettingsStore(
    (state) =>
      state.taskFormPreferencesByAccount[accountScope] ??
      DEFAULT_TASK_FORM_PREFERENCES
  );
export const useSetTaskFormMode = () =>
  useSettingsStore((state) => state.setTaskFormMode);
export const useSetTaskFormFieldVisible = () =>
  useSettingsStore((state) => state.setTaskFormFieldVisible);
