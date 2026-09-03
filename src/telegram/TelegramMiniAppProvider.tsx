import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  applyTelegramViewportVariables,
  applyTelegramThemeVariables,
  getTelegramWebApp,
  hasTelegramLaunchData,
  initializeTelegramWebApp,
} from "./telegramMiniAppBridge";
import { TelegramMiniAppContext } from "./telegramMiniAppContext";
import {
  loadTelegramSdk,
  needsTelegramSdk,
} from "./telegramSdkLoader";

const TelegramSdkGateScreen = ({
  error,
  onRetry,
}: {
  error: boolean;
  onRetry?: () => void;
}) => (
  <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-5 text-slate-100">
    <section
      className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center"
      role={error ? "alert" : "status"}
      aria-label={error ? undefined : "Подготовка Telegram"}
    >
      <img src="/Glowy.png" alt="" className="mx-auto h-16 w-16 object-contain" />
      <h1 className="mt-4 font-display text-2xl font-black">
        {error ? "Не удалось подготовить Telegram" : "Открываем Glowy"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {error
          ? "Проверьте подключение и попробуйте ещё раз. Ваши данные не изменены."
          : "Подготавливаем безопасный вход через Telegram…"}
      </p>
      {error && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-bold"
        >
          Повторить
        </button>
      )}
    </section>
  </main>
);

const TelegramRuntimeProvider = ({
  children,
  webApp,
}: {
  children: ReactNode;
  webApp: ReturnType<typeof getTelegramWebApp>;
}) => {
  const isTelegramMiniApp = hasTelegramLaunchData(webApp);

  useEffect(() => {
    if (!isTelegramMiniApp || !webApp) return;
    initializeTelegramWebApp(webApp);
    document.documentElement.classList.add("telegram-mini-app");
    document.documentElement.dataset.telegramColorScheme =
      webApp.colorScheme || "dark";

    const syncViewport = () => applyTelegramViewportVariables(webApp);
    const syncTheme = () => {
      document.documentElement.dataset.telegramColorScheme =
        webApp.colorScheme || "dark";
      applyTelegramThemeVariables(webApp);
    };
    syncViewport();
    syncTheme();
    for (const event of [
      "viewportChanged",
      "safeAreaChanged",
      "contentSafeAreaChanged",
    ]) {
      webApp.onEvent?.(event, syncViewport);
    }
    webApp.onEvent?.("themeChanged", syncTheme);

    return () => {
      document.documentElement.classList.remove("telegram-mini-app");
      delete document.documentElement.dataset.telegramColorScheme;
      for (const event of [
        "viewportChanged",
        "safeAreaChanged",
        "contentSafeAreaChanged",
      ]) {
        webApp.offEvent?.(event, syncViewport);
      }
      webApp.offEvent?.("themeChanged", syncTheme);
    };
  }, [isTelegramMiniApp, webApp]);

  return (
    <TelegramMiniAppContext.Provider value={{ webApp, isTelegramMiniApp }}>
      {children}
    </TelegramMiniAppContext.Provider>
  );
};

const TelegramSdkGate = ({ children }: { children: ReactNode }) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; webApp: NonNullable<ReturnType<typeof getTelegramWebApp>> }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    if (state.status !== "loading") return;
    let active = true;
    void loadTelegramSdk().then(
      (webApp) => {
        if (active) setState({ status: "ready", webApp });
      },
      () => {
        if (active) setState({ status: "error" });
      }
    );
    return () => {
      active = false;
    };
  }, [attempt, state.status]);

  if (state.status === "ready") {
    return <TelegramRuntimeProvider webApp={state.webApp}>{children}</TelegramRuntimeProvider>;
  }
  if (state.status === "error") {
    return (
      <TelegramSdkGateScreen
        error
        onRetry={() => {
          setState({ status: "loading" });
          setAttempt((value) => value + 1);
        }}
      />
    );
  }
  return <TelegramSdkGateScreen error={false} />;
};

export const TelegramMiniAppProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  if (needsTelegramSdk(location)) {
    return <TelegramSdkGate>{children}</TelegramSdkGate>;
  }
  return <TelegramRuntimeProvider webApp={getTelegramWebApp()}>{children}</TelegramRuntimeProvider>;
};
