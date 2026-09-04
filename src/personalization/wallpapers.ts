export type AppWallpaperId = "midnight" | "nebula" | "aurora" | "custom";

export interface AppWallpaperPreset {
  id: Exclude<AppWallpaperId, "custom">;
  label: string;
  description: string;
  backgroundImage: string;
}

export const DEFAULT_APP_WALLPAPER: AppWallpaperId = "midnight";

export const APP_WALLPAPER_PRESETS: AppWallpaperPreset[] = [
  {
    id: "midnight",
    label: "Глубокая ночь",
    description: "Ровный тёмный фон без лишних деталей",
    backgroundImage:
      "linear-gradient(145deg, #01030a 0%, #030615 55%, #070414 100%)",
  },
  {
    id: "nebula",
    label: "Спокойный космос",
    description: "Мягкое индиго и холодное свечение",
    backgroundImage:
      "radial-gradient(circle at 78% 16%, rgba(56, 189, 248, 0.18), transparent 28%), radial-gradient(circle at 18% 82%, rgba(99, 102, 241, 0.22), transparent 34%), linear-gradient(145deg, #01030b 0%, #06091a 58%, #090520 100%)",
  },
  {
    id: "aurora",
    label: "Тихая дымка",
    description: "Сдержанный фиолетовый градиент",
    backgroundImage:
      "radial-gradient(ellipse at 50% 110%, rgba(124, 58, 237, 0.24), transparent 48%), radial-gradient(circle at 12% 8%, rgba(79, 70, 229, 0.16), transparent 30%), linear-gradient(160deg, #01030a 0%, #070719 62%, #0d0619 100%)",
  },
];

export const isAppWallpaperId = (value: unknown): value is AppWallpaperId =>
  value === "midnight" ||
  value === "nebula" ||
  value === "aurora" ||
  value === "custom";

export const normalizeAppWallpaperId = (value: unknown): AppWallpaperId =>
  isAppWallpaperId(value) ? value : DEFAULT_APP_WALLPAPER;

export const getPresetWallpaper = (wallpaperId: AppWallpaperId) =>
  APP_WALLPAPER_PRESETS.find(({ id }) => id === wallpaperId) ??
  APP_WALLPAPER_PRESETS[0];
