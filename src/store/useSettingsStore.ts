import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TaskViewMode = "list" | "grid";

interface SettingsStore {
  isDarkMode: boolean;
  taskViewMode: TaskViewMode;
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setTaskViewMode: (taskViewMode: TaskViewMode) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isDarkMode: true,
      taskViewMode: "list",
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (isDarkMode: boolean) => set(() => ({ isDarkMode })),
      setTaskViewMode: (taskViewMode: TaskViewMode) =>
        set(() => ({ taskViewMode })),
    }),
    {
      name: "glowy-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const useIsDarkMode = () =>
  useSettingsStore((state) => state.isDarkMode);
export const useToggleDarkMode = () =>
  useSettingsStore((state) => state.toggleDarkMode);
export const useTaskViewMode = () =>
  useSettingsStore((state) => state.taskViewMode);
export const useSetTaskViewMode = () =>
  useSettingsStore((state) => state.setTaskViewMode);
