export type TelegramThemeParams = Record<string, string | undefined>;

type TelegramBackButton = {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
};

export type TelegramWebApp = {
  initData: string;
  colorScheme?: "light" | "dark";
  themeParams?: TelegramThemeParams;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  contentSafeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  BackButton?: TelegramBackButton;
  ready: () => void;
  expand: () => void;
  close?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  onEvent?: (event: string, callback: () => void) => void;
  offEvent?: (event: string, callback: () => void) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const getTelegramWebApp = () =>
  typeof window === "undefined" ? null : window.Telegram?.WebApp ?? null;

export const hasTelegramLaunchData = (webApp = getTelegramWebApp()) =>
  Boolean(webApp?.initData?.trim());

export const initializeTelegramWebApp = (webApp = getTelegramWebApp()) => {
  if (!webApp) return false;
  webApp.ready();
  webApp.expand();
  return true;
};

const setPixelVariable = (name: string, value: number | undefined) => {
  if (!Number.isFinite(value)) return;
  document.documentElement.style.setProperty(name, `${Math.max(0, value || 0)}px`);
};

export const applyTelegramViewportVariables = (webApp = getTelegramWebApp()) => {
  if (!webApp || typeof document === "undefined") return;
  setPixelVariable("--tg-viewport-height", webApp.viewportHeight);
  setPixelVariable("--tg-viewport-stable-height", webApp.viewportStableHeight);

  const safe = webApp.safeAreaInset;
  const content = webApp.contentSafeAreaInset;
  setPixelVariable("--tg-safe-area-inset-top", safe?.top);
  setPixelVariable("--tg-safe-area-inset-bottom", safe?.bottom);
  setPixelVariable("--tg-safe-area-inset-left", safe?.left);
  setPixelVariable("--tg-safe-area-inset-right", safe?.right);
  setPixelVariable("--tg-content-safe-area-inset-top", content?.top);
  setPixelVariable("--tg-content-safe-area-inset-bottom", content?.bottom);
  setPixelVariable("--tg-content-safe-area-inset-left", content?.left);
  setPixelVariable("--tg-content-safe-area-inset-right", content?.right);
};

const toCssVariable = (name: string) =>
  `--tg-theme-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/_/g, "-")}`;

export const applyTelegramThemeVariables = (webApp = getTelegramWebApp()) => {
  if (!webApp || typeof document === "undefined") return;
  for (const [name, value] of Object.entries(webApp.themeParams || {})) {
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
      document.documentElement.style.setProperty(toCssVariable(name), value);
    }
  }
};
