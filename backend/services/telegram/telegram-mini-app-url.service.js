const TARGETS = new Set([
  "home",
  "tasks",
  "notes",
  "ai",
  "progress",
  "analytics",
  "settings",
]);

export const createTelegramMiniAppUrlService = ({
  baseUrl = process.env.TELEGRAM_MINI_APP_URL,
} = {}) => {
  let parsedBase = null;
  try {
    const candidate = new URL(baseUrl || "");
    if (candidate.protocol === "https:") parsedBase = candidate;
  } catch {
    parsedBase = null;
  }

  return {
    configured: Boolean(parsedBase),
    build(target = "home") {
      if (!parsedBase) return null;
      const url = new URL(parsedBase.toString());
      url.searchParams.set("target", TARGETS.has(target) ? target : "home");
      return url.toString();
    },
  };
};

export default createTelegramMiniAppUrlService;
