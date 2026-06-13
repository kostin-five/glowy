import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  Mail,
  Monitor,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import {
  useSetThemeMode,
  useThemeMode,
  type ThemeMode,
} from "../store/useSettingsStore";
import {
  useEmail,
  useIsGuest,
  useName,
} from "../store/useAuthStore";
import { useLogout } from "../hooks/useLogout";

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Темная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
];

const SettingsPage = () => {
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedToastTimerRef = useRef<number | null>(null);
  const name = useName();
  const email = useEmail();
  const isGuest = useIsGuest();
  const handleLogout = useLogout();
  const themeMode = useThemeMode();
  const setThemeMode = useSetThemeMode();

  const showSettingsSavedToast = () => {
    if (savedToastTimerRef.current) {
      window.clearTimeout(savedToastTimerRef.current);
    }

    setShowSavedToast(true);
    savedToastTimerRef.current = window.setTimeout(() => {
      setShowSavedToast(false);
      savedToastTimerRef.current = null;
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (savedToastTimerRef.current) {
        window.clearTimeout(savedToastTimerRef.current);
      }
    };
  }, []);

  const handleThemeModeChange = (themeMode: ThemeMode) => {
    setThemeMode(themeMode);
    showSettingsSavedToast();
  };

  const handleClearLocalCache = () => {
    const authStorage = localStorage.getItem("auth-storage");

    localStorage.clear();
    if (authStorage) {
      localStorage.setItem("auth-storage", authStorage);
    }

    window.location.reload();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 md:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-950 dark:text-slate-100 md:text-4xl">
          Настройки
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
          Управляй профилем, темой, стартовым экраном и локальными данными
          приложения.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
              <User size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Профиль
              </p>
              <h2 className="mt-1 truncate font-display text-xl font-bold text-slate-950 dark:text-slate-100">
                {name || "Пользователь"}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                {email || "Почта не указана"}
              </p>
              {isGuest && (
                <span className="mt-3 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-300">
                  Демо-режим (функции ограничены)
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
          >
            <LogOut size={17} />
            Выйти из аккаунта
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none md:p-6">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
            <SlidersHorizontal size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
              Интерфейс и тема
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Выбери постоянную тему или доверься системной настройке
              устройства.
            </p>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-3">
          {themeOptions.map(({ value, label, icon: Icon }) => {
            const isActive = themeMode === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeModeChange(value)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
                aria-pressed={isActive}
              >
                <Icon size={17} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
              Система
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Очисти локальный кэш интерфейса без выхода из аккаунта.
            </p>
            <a
              href="mailto:contact@example.test"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-500 transition-colors hover:text-indigo-400 dark:text-indigo-300"
            >
              <Mail size={17} />
              contact@example.test
            </a>
          </div>

          <button
            type="button"
            onClick={handleClearLocalCache}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-red-400/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <Trash2 size={17} />
            Очистить локальный кэш
          </button>
        </div>
      </section>

      {showSavedToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 rounded-2xl border border-emerald-400/30 bg-slate-950/95 px-4 py-3 text-center text-sm font-bold text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-xl dark:bg-slate-900/95"
        >
          Настройки сохранены
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
