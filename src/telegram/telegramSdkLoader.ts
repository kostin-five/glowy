import {
  getTelegramWebApp,
  hasTelegramLaunchData,
  type TelegramWebApp,
} from "./telegramMiniAppBridge";

export const TELEGRAM_SDK_URL = "https://telegram.org/js/telegram-web-app.js?59";
export const TELEGRAM_SDK_TIMEOUT_MS = 10_000;

const MINI_APP_TAB_KEY = "glowy_telegram_mini_app_tab";
const LAUNCH_PARAMETER_PATTERN =
  /(?:^|[?&#])tgWebApp(?:Data|Platform|Version|ThemeParams|StartParam)(?:=|&|$)/;

type LocationLike = Pick<Location, "pathname" | "search" | "hash">;
type LoadTelegramSdkOptions = { timeoutMs?: number };

let activeAttempt: Promise<TelegramWebApp> | null = null;

const isTelegramWebApp = (value: TelegramWebApp | null): value is TelegramWebApp =>
  Boolean(
    value &&
      typeof value.initData === "string" &&
      typeof value.ready === "function" &&
      typeof value.expand === "function"
  );

const hasMiniAppTabMarker = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(MINI_APP_TAB_KEY) === "1";
  } catch {
    return false;
  }
};

export const markTelegramMiniAppTab = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MINI_APP_TAB_KEY, "1");
  } catch {
    // Storage may be disabled inside a WebView. The current launch still works.
  }
};

export const needsTelegramSdk = (location: LocationLike) => {
  if (location.pathname === "/telegram" || location.pathname === "/telegram/") {
    return true;
  }
  if (LAUNCH_PARAMETER_PATTERN.test(`${location.search}${location.hash}`)) {
    return true;
  }
  if (hasTelegramLaunchData()) return true;
  return hasMiniAppTabMarker();
};

export const loadTelegramSdk = (
  { timeoutMs = TELEGRAM_SDK_TIMEOUT_MS }: LoadTelegramSdkOptions = {}
) => {
  const existing = getTelegramWebApp();
  if (isTelegramWebApp(existing)) {
    if (hasTelegramLaunchData(existing)) markTelegramMiniAppTab();
    return Promise.resolve(existing);
  }
  if (activeAttempt) return activeAttempt;

  const attempt = new Promise<TelegramWebApp>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Telegram SDK не удалось подготовить."));
      return;
    }

    const script = document.createElement("script");
    script.src = TELEGRAM_SDK_URL;
    script.async = true;
    script.dataset.glowyTelegramSdk = "";
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      reject(new Error(message));
    };
    const handleLoad = () => {
      if (settled) return;
      const webApp = getTelegramWebApp();
      if (!isTelegramWebApp(webApp)) {
        fail("Telegram SDK не удалось подготовить.");
        return;
      }
      settled = true;
      cleanup();
      if (hasTelegramLaunchData(webApp)) markTelegramMiniAppTab();
      resolve(webApp);
    };
    const handleError = () => fail("Telegram SDK не удалось загрузить.");
    const timeoutId = window.setTimeout(
      () => fail(`Подготовка Telegram превысила ${Math.round(timeoutMs / 1000)} секунд.`),
      timeoutMs
    );

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    document.head.append(script);
  });

  activeAttempt = attempt;
  const clearAttempt = () => {
    if (activeAttempt === attempt) activeAttempt = null;
  };
  void attempt.then(clearAttempt, clearAttempt);
  return attempt;
};
