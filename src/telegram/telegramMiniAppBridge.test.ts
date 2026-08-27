// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTelegramThemeVariables,
  applyTelegramViewportVariables,
  hasTelegramLaunchData,
  initializeTelegramWebApp,
  type TelegramWebApp,
} from "./telegramMiniAppBridge";

afterEach(() => {
  delete window.Telegram;
});

describe("Telegram Mini App bridge", () => {
  it("initializes only a supplied bridge and requires signed launch data", () => {
    const webApp = {
      initData: "signed-data",
      ready: vi.fn(),
      expand: vi.fn(),
    } as TelegramWebApp;
    window.Telegram = { WebApp: webApp };

    expect(hasTelegramLaunchData()).toBe(true);
    expect(initializeTelegramWebApp()).toBe(true);
    expect(webApp.ready).toHaveBeenCalledOnce();
    expect(webApp.expand).toHaveBeenCalledOnce();
  });

  it("does not treat an ordinary browser as Telegram", () => {
    expect(hasTelegramLaunchData()).toBe(false);
    expect(initializeTelegramWebApp()).toBe(false);
  });

  it("maps Telegram theme, viewport and safe-area values to CSS variables", () => {
    const webApp = {
      initData: "signed-data",
      ready: vi.fn(),
      expand: vi.fn(),
      viewportHeight: 640,
      viewportStableHeight: 620,
      safeAreaInset: { top: 8, bottom: 12 },
      contentSafeAreaInset: { top: 44, bottom: 20 },
      themeParams: { bg_color: "#101827", textColor: "#f8fafc", unsafe: "red" },
    } as TelegramWebApp;

    applyTelegramViewportVariables(webApp);
    applyTelegramThemeVariables(webApp);

    expect(document.documentElement.style.getPropertyValue("--tg-viewport-height")).toBe("640px");
    expect(document.documentElement.style.getPropertyValue("--tg-content-safe-area-inset-bottom")).toBe("20px");
    expect(document.documentElement.style.getPropertyValue("--tg-theme-bg-color")).toBe("#101827");
    expect(document.documentElement.style.getPropertyValue("--tg-theme-text-color")).toBe("#f8fafc");
    expect(document.documentElement.style.getPropertyValue("--tg-theme-unsafe")).toBe("");
  });
});
