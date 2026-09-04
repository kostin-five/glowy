import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CUSTOM_WALLPAPER_ACCEPT,
  CustomWallpaperError,
  deleteCustomWallpaper,
  getCustomWallpaper,
  saveCustomWallpaper,
} from "../../personalization/customWallpaperStorage";
import {
  APP_WALLPAPER_PRESETS,
  DEFAULT_APP_WALLPAPER,
  type AppWallpaperId,
} from "../../personalization/wallpapers";
import {
  useAppWallpaperId,
  useSetAppWallpaperId,
} from "../../store/useSettingsStore";

interface WallpaperPickerProps {
  onSaved: () => void;
}

const getErrorMessage = (error: unknown) =>
  error instanceof CustomWallpaperError
    ? error.message
    : "Не удалось сохранить изображение на этом устройстве.";

const WallpaperPicker = ({ onSaved }: WallpaperPickerProps) => {
  const wallpaperId = useAppWallpaperId();
  const setWallpaperId = useSetAppWallpaperId();
  const inputRef = useRef<HTMLInputElement>(null);
  const storageMutationRef = useRef(0);
  const [hasCustomWallpaper, setHasCustomWallpaper] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const mutationAtStart = storageMutationRef.current;
    void getCustomWallpaper()
      .then((blob) => {
        if (
          isCurrent &&
          storageMutationRef.current === mutationAtStart
        ) {
          setHasCustomWallpaper(Boolean(blob));
        }
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const selectWallpaper = (nextId: AppWallpaperId) => {
    setWallpaperId(nextId);
    setError(null);
    onSaved();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      storageMutationRef.current += 1;
      setIsSaving(true);
      setError(null);
      await saveCustomWallpaper(file);
      setHasCustomWallpaper(true);
      setWallpaperId("custom");
      onSaved();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustom = async () => {
    try {
      storageMutationRef.current += 1;
      setIsSaving(true);
      setError(null);
      await deleteCustomWallpaper();
      setHasCustomWallpaper(false);
      if (wallpaperId === "custom") {
        setWallpaperId(DEFAULT_APP_WALLPAPER);
      }
      onSaved();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
      <h3 className="font-display text-lg font-bold text-slate-950 dark:text-slate-100">
        Фон приложения
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        Выбери спокойный фон или загрузи своё изображение. Личный файл останется только на этом устройстве.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {APP_WALLPAPER_PRESETS.map((preset) => {
          const isActive = wallpaperId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectWallpaper(preset.id)}
              className={`overflow-hidden rounded-2xl border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isActive
                  ? "border-indigo-500 ring-2 ring-indigo-500/25"
                  : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-500/60"
              }`}
            >
              <span
                className="block h-20 rounded-xl border border-white/10 bg-cover bg-center"
                style={{ backgroundImage: preset.backgroundImage }}
                aria-hidden="true"
              />
              <span className="mt-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                {preset.label}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/35 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Своё изображение
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            PNG, JPEG или WebP до 5 МБ. Поверх изображения сохраняется затемнение.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={CUSTOM_WALLPAPER_ACCEPT}
            onChange={(event) => void handleUpload(event)}
            className="sr-only"
            aria-label="Загрузить своё изображение"
          />
          <button
            type="button"
            disabled={isSaving}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            <ImagePlus size={17} />
            {isSaving ? "Сохраняю…" : hasCustomWallpaper ? "Заменить" : "Загрузить"}
          </button>
          {hasCustomWallpaper && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleDeleteCustom()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-rose-300 hover:text-rose-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-400/40 dark:hover:text-rose-300"
            >
              <Trash2 size={17} />
              Удалить
            </button>
          )}
          {wallpaperId !== DEFAULT_APP_WALLPAPER && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => selectWallpaper(DEFAULT_APP_WALLPAPER)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800"
            >
              <RotateCcw size={17} />
              Сбросить
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
};

export default WallpaperPicker;
