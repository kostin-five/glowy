import { createContext, useContext } from "react";
import type { TelegramWebApp } from "./telegramMiniAppBridge";

export type TelegramMiniAppContextValue = {
  webApp: TelegramWebApp | null;
  isTelegramMiniApp: boolean;
};

export const TelegramMiniAppContext = createContext<TelegramMiniAppContextValue>({
  webApp: null,
  isTelegramMiniApp: false,
});

export const useTelegramMiniApp = () => useContext(TelegramMiniAppContext);
