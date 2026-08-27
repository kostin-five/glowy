import { getTelegramWebApp, type TelegramWebApp } from "./telegramMiniAppBridge";

const isAllowedHost = (hostname: string) =>
  hostname === "glowy-ai.ru" ||
  hostname.endsWith(".glowy-ai.ru") ||
  hostname === "yookassa.ru" ||
  hostname.endsWith(".yookassa.ru") ||
  hostname === "yoomoney.ru" ||
  hostname.endsWith(".yoomoney.ru");

export const isAllowedTelegramExternalUrl = (value: string) => {
  try {
    const url = new URL(value, window.location.origin);
    return (
      url.protocol === "https:" &&
      (url.origin === window.location.origin || isAllowedHost(url.hostname))
    );
  } catch {
    return false;
  }
};

export const openTelegramExternalLink = (
  value: string,
  webApp: TelegramWebApp | null = getTelegramWebApp(),
  navigate: (url: string) => void = (url) => window.location.assign(url)
) => {
  const url = new URL(value, window.location.origin).toString();
  if (!isAllowedTelegramExternalUrl(url)) return false;
  if (webApp?.initData && webApp.openLink) {
    webApp.openLink(url);
  } else {
    navigate(url);
  }
  return true;
};
