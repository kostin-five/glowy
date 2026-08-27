import {
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  applyTelegramViewportVariables,
  applyTelegramThemeVariables,
  getTelegramWebApp,
  hasTelegramLaunchData,
  initializeTelegramWebApp,
} from "./telegramMiniAppBridge";
import { TelegramMiniAppContext } from "./telegramMiniAppContext";

export const TelegramMiniAppProvider = ({ children }: { children: ReactNode }) => {
  const webApp = useMemo(() => getTelegramWebApp(), []);
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
