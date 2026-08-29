export const TELEGRAM_MINI_APP_ROUTES = {
  home: "/dashboard",
  tasks: "/tasks",
  notes: "/notes",
  ai: "/ai",
  progress: "/progress",
  analytics: "/analytics",
  settings: "/settings",
} as const;

export type TelegramMiniAppTarget = keyof typeof TELEGRAM_MINI_APP_ROUTES;

export const getTelegramMiniAppRoute = (target: string | null | undefined) =>
  target && target in TELEGRAM_MINI_APP_ROUTES
    ? TELEGRAM_MINI_APP_ROUTES[target as TelegramMiniAppTarget]
    : TELEGRAM_MINI_APP_ROUTES.home;

export const isTelegramMiniAppRoute = (path: string) =>
  Object.values(TELEGRAM_MINI_APP_ROUTES).some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
