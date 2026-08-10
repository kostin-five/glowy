export const ANALYTICS_CONSENT_KEY = "glowy_cookie_consent";
export const ANALYTICS_SESSION_EVENT_PREFIX = "glowy_analytics_event:";

const DEFAULT_YANDEX_METRIKA_ID = 109727314;
const allowedEvents = [
  "landing_cta_click",
  "signup_started",
  "signup_completed",
  "first_task_created",
  "first_ai_request",
  "focus_checkout_started",
] as const;

const allowedParameterKeys = [
  "utm_source",
  "utm_campaign",
  "utm_content",
] as const;

type AnalyticsEventName = (typeof allowedEvents)[number];
type AnalyticsParameterKey = (typeof allowedParameterKeys)[number];
type AnalyticsParameters = Partial<Record<AnalyticsParameterKey, string>>;

type YandexMetrikaFunction = {
  (...args: unknown[]): void;
  a?: unknown[];
  l?: number;
};

declare global {
  interface Window {
    ym?: YandexMetrikaFunction;
    __YANDEX_METRIKA_INITIALIZED__?: boolean;
  }
}

const getMetrikaId = () => {
  const envId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID);
  return Number.isFinite(envId) && envId > 0
    ? envId
    : DEFAULT_YANDEX_METRIKA_ID;
};

export const getAnalyticsConsent = () =>
  localStorage.getItem(ANALYTICS_CONSENT_KEY);

export const hasAnalyticsConsent = () => getAnalyticsConsent() === "accepted";

const sanitizeParameters = (
  parameters: Record<string, unknown> = {}
): AnalyticsParameters => {
  const safeParameters: AnalyticsParameters = {};

  for (const key of allowedParameterKeys) {
    const value = parameters[key];
    if (typeof value !== "string") continue;

    const normalizedValue = value.trim().slice(0, 100);
    if (normalizedValue) {
      safeParameters[key] = normalizedValue;
    }
  }

  return safeParameters;
};

export const trackProductEvent = (
  event: AnalyticsEventName,
  parameters?: Record<string, unknown>
) => {
  if (!allowedEvents.includes(event)) {
    return false;
  }

  if (!hasAnalyticsConsent() || !window.__YANDEX_METRIKA_INITIALIZED__ || !window.ym) {
    return false;
  }

  window.ym(getMetrikaId(), "reachGoal", event, sanitizeParameters(parameters));
  return true;
};

export const trackProductEventOnce = (
  event: AnalyticsEventName,
  parameters?: Record<string, unknown>
) => {
  const storageKey = `${ANALYTICS_SESSION_EVENT_PREFIX}${event}`;
  if (sessionStorage.getItem(storageKey)) return false;

  const wasTracked = trackProductEvent(event, parameters);
  if (wasTracked) {
    sessionStorage.setItem(storageKey, "1");
  }

  return wasTracked;
};

export type { AnalyticsEventName };
