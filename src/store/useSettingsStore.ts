import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsStore {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDarkMode: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      isDarkMode: true,
      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (isDarkMode: boolean) => set(() => ({ isDarkMode })),
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
