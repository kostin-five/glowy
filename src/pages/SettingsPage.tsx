import { useEffect, useRef, useState } from "react";
import {
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Mail,
  Monitor,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
  Tag,
} from "lucide-react";
import { Link } from "react-router-dom";
import Modal from "../components/ui/Modal";
import AiApi from "../api/AiApi";
import { UserApi } from "../api/UserApi";
import {
  useSetThemeMode,
  useThemeMode,
  useStartRoute,
  useSetStartRoute,
  type ThemeMode,
} from "../store/useSettingsStore";
import {
  GUEST_REQUEST_LIMIT,
  useAuthStore,
  useEmail,
  useIsGuest,
  useName,
} from "../store/useAuthStore";
import { useLogout } from "../hooks/useLogout";
import { clearLocalAuthSession } from "../api/authSession";

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Темная", icon: Moon },
  { value: "system", label: "Системная", icon: Monitor },
];

const startRouteOptions: Array<{
  value: "/dashboard" | "/tasks";
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { value: "/dashboard", label: "Пункт управления", icon: LayoutDashboard },
  { value: "/tasks", label: "Задачи", icon: CheckSquare },
];

const planLabels = {
  demo: "Демо-доступ",
  start: "Стартовый",
  focus: "Focus",
  founder: "Founder",
  forever: "Forever",
} as const;

const SettingsPage = () => {
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [aiUsage, setAiUsage] = useState<{
    plan: "demo" | "start" | "focus" | "founder" | "forever";
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [aiUsageUnavailable, setAiUsageUnavailable] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const savedToastTimerRef = useRef<number | null>(null);
  const name = useName();
  const email = useEmail();
  const isGuest = useIsGuest();
  const guestRequestsCount = useAuthStore((state) => state.guestRequestsCount);
  const handleLogout = useLogout();
  const themeMode = useThemeMode();
  const setThemeMode = useSetThemeMode();
  const startRoute = useStartRoute();
  const setStartRoute = useSetStartRoute();

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

  useEffect(() => {
    let isMounted = true;

    const loadAiUsage = async () => {
      if (isGuest) {
        if (!isMounted) return;
        setAiUsage({
          plan: "demo",
          used: guestRequestsCount,
          limit: GUEST_REQUEST_LIMIT,
          remaining: Math.max(0, GUEST_REQUEST_LIMIT - guestRequestsCount),
        });
        setAiUsageUnavailable(false);
        return;
      }

      const usage = await AiApi.getAiUsage();
      if (!isMounted) return;

      if (usage) {
        setAiUsage(usage);
        setAiUsageUnavailable(false);
      } else {
        setAiUsage(null);
        setAiUsageUnavailable(true);
      }
    };

    loadAiUsage();

    return () => {
      isMounted = false;
    };
  }, [guestRequestsCount, isGuest]);

  const handleThemeModeChange = (themeMode: ThemeMode) => {
    setThemeMode(themeMode);
    showSettingsSavedToast();
  };

  const handleStartRouteChange = (route: "/dashboard" | "/tasks") => {
    setStartRoute(route);
    showSettingsSavedToast();
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      setDeleteError(null);
      await UserApi.deleteAccount();
      clearLocalAuthSession();
      setIsDeleteModalOpen(false);
      window.location.assign("/");
    } catch (error) {
      console.error("Delete account request failed:", error);
      setDeleteError("Не удалось удалить аккаунт. Попробуй ещё раз.");
    } finally {
      setIsDeletingAccount(false);
    }
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
            <Tag size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
              Тарифы и лимиты
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Коротко о текущем тарифе и AI-запросах сегодня.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-950/40">
                Текущий тариф: {aiUsage ? planLabels[aiUsage.plan] : aiUsageUnavailable ? "Недоступно" : "Загрузка..."}
              </span>
              {aiUsage && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                  AI-запросы сегодня: {aiUsage.used} / {aiUsage.limit}
                </span>
              )}
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: aiUsage && aiUsage.limit > 0 ? `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` : "0%",
                }}
              />
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              {aiUsage
                ? `Осталось ${aiUsage.remaining}`
                : aiUsageUnavailable
                  ? "Лимит временно недоступен"
                  : "Загружаем лимиты..."}
            </p>
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
          >
            Перейти к тарифам
          </Link>
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
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
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
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
              Стартовый экран
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Выбери, куда открываться после входа и при переходе на главную.
            </p>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950/60 sm:grid-cols-2">
          {startRouteOptions.map(({ value, label, icon: Icon }) => {
            const isActive = startRoute === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleStartRouteChange(value)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
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

      {!isGuest && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-5 shadow-sm shadow-slate-200/60 dark:border-rose-400/20 dark:bg-rose-500/10 dark:shadow-none md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-rose-700 dark:text-rose-200">
                Удаление аккаунта
              </h2>
              <p className="mt-1 text-sm leading-6 text-rose-700/80 dark:text-rose-100/80">
                Аккаунт можно удалить только с подтверждением.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/70 bg-white px-4 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
            >
              <Trash2 size={17} />
              Удалить аккаунт
            </button>
          </div>
        </section>
      )}

      {showSavedToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 rounded-2xl border border-emerald-400/30 bg-slate-950/95 px-4 py-3 text-center text-sm font-bold text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-xl dark:bg-slate-900/95"
        >
          Настройки сохранены
        </div>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingAccount) {
            setIsDeleteModalOpen(false);
            setDeleteError(null);
          }
        }}
        title="Удалить аккаунт"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Аккаунт, задачи и данные будут удалены без восстановления.
          </p>
          {deleteError && (
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">
              {deleteError}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (!isDeletingAccount) {
                  setIsDeleteModalOpen(false);
                  setDeleteError(null);
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeletingAccount ? "Удаляем..." : "Удалить аккаунт"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
