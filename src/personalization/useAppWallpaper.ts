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

export const useAppWallpaper = (): AppWallpaperPresentation => {
  const wallpaperId = useAppWallpaperId();
  const wallpaperRevision = useAppWallpaperRevision();
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    let objectUrl: string | null = null;

    if (wallpaperId !== "custom") {
      setCustomUrl(null);
      return () => undefined;
    }

    void getCustomWallpaper()
      .then((blob) => {
        if (!isCurrent || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setCustomUrl(objectUrl);
      })
      .catch(() => {
        if (isCurrent) setCustomUrl(null);
      });

    return () => {
      isCurrent = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [wallpaperId, wallpaperRevision]);

  if (wallpaperId === "custom" && customUrl) {
    return {
      backgroundImage: `url("${customUrl}")`,
      isCustom: true,
    };
  }

  return {
    backgroundImage: getPresetWallpaper(wallpaperId).backgroundImage,
    isCustom: false,
  };
};
