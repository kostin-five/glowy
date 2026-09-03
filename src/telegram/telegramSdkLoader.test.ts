// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TELEGRAM_SDK_URL,
  loadTelegramSdk,
  markTelegramMiniAppTab,
  needsTelegramSdk,
} from "./telegramSdkLoader";
import type { TelegramWebApp } from "./telegramMiniAppBridge";

const createWebApp = (initData = "synthetic-launch") => ({
  initData,
  ready: vi.fn(),
  expand: vi.fn(),
}) as TelegramWebApp;

const sdkScript = () =>
  document.querySelector<HTMLScriptElement>(`script[src="${TELEGRAM_SDK_URL}"]`);

afterEach(() => {
  vi.useRealTimers();
  delete window.Telegram;
  sessionStorage.clear();
  document.querySelectorAll("script[data-glowy-telegram-sdk]").forEach((script) => script.remove());
});

describe("Telegram SDK context detection", () => {
  it("does not require Telegram for ordinary routes", () => {
    expect(needsTelegramSdk({ pathname: "/login", search: "", hash: "" })).toBe(false);
  });

  it("recognizes the entry route and launch parameter names without trusting their values", () => {
    expect(needsTelegramSdk({ pathname: "/telegram", search: "", hash: "" })).toBe(true);
    expect(needsTelegramSdk({ pathname: "/", search: "?tgWebAppPlatform=web", hash: "" })).toBe(true);
    expect(needsTelegramSdk({ pathname: "/", search: "", hash: "#tgWebAppData=synthetic" })).toBe(true);
  });

  it("recognizes an already initialized Mini App and a tab marker", () => {
    window.Telegram = { WebApp: createWebApp() };
    expect(needsTelegramSdk({ pathname: "/tasks", search: "", hash: "" })).toBe(true);

    delete window.Telegram;
    markTelegramMiniAppTab();
    expect(needsTelegramSdk({ pathname: "/tasks", search: "", hash: "" })).toBe(true);
  });
});

describe("Telegram SDK loader", () => {
  it("returns a valid existing bridge without adding a script", async () => {
    const webApp = createWebApp();
    window.Telegram = { WebApp: webApp };

    await expect(loadTelegramSdk()).resolves.toBe(webApp);
    expect(sdkScript()).toBeNull();
  });

  it("shares one active attempt and resolves it after a valid load", async () => {
    const first = loadTelegramSdk();
    const second = loadTelegramSdk();
    expect(first).toBe(second);
    expect(document.querySelectorAll("script[data-glowy-telegram-sdk]")).toHaveLength(1);

    const webApp = createWebApp();
    window.Telegram = { WebApp: webApp };
    sdkScript()?.dispatchEvent(new Event("load"));

    await expect(first).resolves.toBe(webApp);
    await expect(second).resolves.toBe(webApp);
  });

  it("rejects an invalid global and permits an explicit new attempt", async () => {
    const first = loadTelegramSdk();
    sdkScript()?.dispatchEvent(new Event("load"));
    await expect(first).rejects.toThrow("не удалось подготовить");

    const second = loadTelegramSdk();
    expect(second).not.toBe(first);
    expect(document.querySelectorAll("script[data-glowy-telegram-sdk]")).toHaveLength(1);
    sdkScript()?.dispatchEvent(new Event("error"));
    await expect(second).rejects.toThrow("не удалось загрузить");
  });

  it("times out after the configured boundary and ignores the old load callback", async () => {
    vi.useFakeTimers();
    const attempt = loadTelegramSdk({ timeoutMs: 10_000 });
    const rejection = expect(attempt).rejects.toThrow("превысила 10 секунд");
    const oldScript = sdkScript();

    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
    expect(oldScript?.isConnected).toBe(false);

    window.Telegram = { WebApp: createWebApp() };
    oldScript?.dispatchEvent(new Event("load"));
    await expect(attempt).rejects.toThrow("превысила 10 секунд");
  });

  it("does not fail when session storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    expect(() => markTelegramMiniAppTab()).not.toThrow();
    spy.mockRestore();
  });
});
