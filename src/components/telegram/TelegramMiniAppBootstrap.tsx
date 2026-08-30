import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TelegramMiniAppApi, type TelegramMiniAppUser } from "../../api/TelegramMiniAppApi";
import { useAuthStore } from "../../store/useAuthStore";
import { useTelegramMiniApp } from "../../telegram/telegramMiniAppContext";
import { getTelegramMiniAppRoute } from "../../telegram/telegramMiniAppRoutes";
import { isTelegramMiniAppAutoRestoreBlocked } from "../../telegram/telegramMiniAppSession";
import RouteLoader from "../ui/RouteLoader";

type State = "loading" | "offline" | "invalid" | "unauthorized" | "error";

const TelegramMiniAppBootstrap = () => {
  const { webApp, isTelegramMiniApp } = useTelegramMiniApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toLogin = useAuthStore((value) => value.toLogin);
  const [state, setState] = useState<State>(() =>
    !isTelegramMiniApp || !webApp?.initData
      ? "invalid"
      : !navigator.onLine
        ? "offline"
        : "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  const targetRoute = getTelegramMiniAppRoute(searchParams.get("target"));
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

  const complete = useCallback((user: TelegramMiniAppUser) => {
    toLogin(user.id, user.name, user.email);
    navigate(targetRoute, { replace: true });
  }, [navigate, targetRoute, toLogin]);

  useEffect(() => {
    requestRef.current?.abort();
    if (!isTelegramMiniApp || !webApp?.initData || !navigator.onLine) return;
    if (isTelegramMiniAppAutoRestoreBlocked()) {
      navigate(`/login?redirect=${encodeURIComponent(targetRoute)}`, { replace: true });
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    TelegramMiniAppApi.restore(webApp.initData, controller.signal)
      .then(complete)
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (
          axios.isAxiosError(error) &&
          error.response?.data?.code === "TELEGRAM_REGISTRATION_REQUIRED"
        ) {
          navigate(`/register?redirect=${encodeURIComponent(targetRoute)}`, { replace: true });
          return;
        }
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 ||
            String(error.response?.data?.code || "").startsWith("TELEGRAM_INIT_DATA_"))
        ) {
          setState("unauthorized");
          return;
        }
        setState(!navigator.onLine || (axios.isAxiosError(error) && !error.response) ? "offline" : "error");
      });
    return () => controller.abort();
  }, [attempt, complete, isTelegramMiniApp, navigate, targetRoute, webApp]);

  const retry = () => {
    if (!navigator.onLine) {
      setState("offline");
      return;
    }
    setState("loading");
    setAttempt((value) => value + 1);
  };

  if (state === "loading") {
    return <RouteLoader className="min-h-[var(--tg-viewport-height,100dvh)]" />;
  }
  const title =
    state === "invalid"
      ? "Откройте Glowy из Telegram"
      : state === "unauthorized"
        ? "Сессия Telegram устарела"
      : state === "offline"
        ? "Для первого входа нужен интернет"
        : "Не удалось открыть Glowy";
  const description =
    state === "invalid"
      ? "Перейдите в чат с ботом и нажмите кнопку «Открыть Glowy»."
      : state === "unauthorized"
        ? "Вернитесь в чат с ботом и откройте Glowy ещё раз, чтобы подтвердить новый запуск."
      : state === "offline"
        ? "Подключитесь к сети и повторите проверку. Сохранённые данные не удалены."
        : "Сервер временно недоступен. Попробуйте ещё раз — данные не потеряются.";

  return (
    <main
      className="flex min-h-[var(--tg-viewport-height,100dvh)] items-center justify-center overflow-x-hidden px-5 text-slate-100"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #020617)",
        color: "var(--tg-theme-text-color, #f8fafc)",
        paddingTop: "max(1.25rem, var(--tg-content-safe-area-inset-top, 0px))",
        paddingBottom: "max(1.25rem, var(--tg-content-safe-area-inset-bottom, 0px))",
      }}
    >
      <section className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center">
        <img src="/Glowy.png" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 font-display text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
        {state !== "invalid" && state !== "unauthorized" && (
          <button type="button" onClick={retry} className="mt-5 min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-bold">
            Повторить
          </button>
        )}
        {(state === "invalid" || state === "unauthorized") && botUsername && (
          <a href={`https://t.me/${botUsername}`} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 font-bold">
            Открыть бота
          </a>
        )}
      </section>
    </main>
  );
};

export default TelegramMiniAppBootstrap;
