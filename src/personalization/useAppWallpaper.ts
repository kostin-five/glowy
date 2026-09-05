import { useEffect, useState } from "react";
import {
  useAppWallpaperId,
  useAppWallpaperRevision,
} from "../store/useSettingsStore";
import { getCustomWallpaper } from "./customWallpaperStorage";
import { getPresetWallpaper } from "./wallpapers";

export interface AppWallpaperPresentation {
  backgroundImage: string;
  isCustom: boolean;
}

interface LoadedCustomWallpaper {
  revision: number;
  url: string;
}

export const useAppWallpaper = (): AppWallpaperPresentation => {
  const wallpaperId = useAppWallpaperId();
  const wallpaperRevision = useAppWallpaperRevision();
  const [customWallpaper, setCustomWallpaper] =
    useState<LoadedCustomWallpaper | null>(null);

  useEffect(() => {
    let isCurrent = true;
    let objectUrl: string | null = null;

    if (wallpaperId !== "custom") {
      return () => undefined;
    }

    void getCustomWallpaper()
      .then((blob) => {
        if (!isCurrent) return;
        if (!blob) {
          setCustomWallpaper(null);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setCustomWallpaper({ revision: wallpaperRevision, url: objectUrl });
      })
      .catch(() => {
        if (isCurrent) setCustomWallpaper(null);
      });

    return () => {
      isCurrent = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [wallpaperId, wallpaperRevision]);

  if (
    wallpaperId === "custom" &&
    customWallpaper?.revision === wallpaperRevision
  ) {
    return {
      backgroundImage: `url("${customWallpaper.url}")`,
      isCustom: true,
    };
  }

  return {
    backgroundImage: getPresetWallpaper(wallpaperId).backgroundImage,
    isCustom: false,
  };
};
