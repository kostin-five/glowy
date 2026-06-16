import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "glowy_cookie_consent";
const YANDEX_METRIKA_SCRIPT_ID = "yandex-metrika-script";
const DEFAULT_YANDEX_METRIKA_ID = 109727314;

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

const getCookieConsent = () => localStorage.getItem(COOKIE_CONSENT_KEY);

const initYandexMetrika = () => {
  if (window.__YANDEX_METRIKA_INITIALIZED__) return;

  const metrikaId = getMetrikaId();

  window.ym =
    window.ym ||
    function ymFallback(...args: unknown[]) {
      window.ym!.a = window.ym!.a || [];
      window.ym!.a.push(args);
    };
  window.ym.l = Date.now();

  if (!document.getElementById(YANDEX_METRIKA_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = YANDEX_METRIKA_SCRIPT_ID;
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}`;
    document.head.appendChild(script);
  }

  window.ym(metrikaId, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });

  window.__YANDEX_METRIKA_INITIALIZED__ = true;
};

const CookieConsent = () => {
  const [consent, setConsent] = useState(() => getCookieConsent());
  const isAccepted = consent === "accepted";
  const isRejected = consent === "rejected";

  useEffect(() => {
    if (isAccepted) {
      initYandexMetrika();
    }
  }, [isAccepted]);

  const acceptCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setConsent("accepted");
  };

  const rejectCookies = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setConsent("rejected");
  };

  if (isAccepted || isRejected) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/95 dark:text-slate-100 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Мы используем cookie</p>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
            Glowy использует Яндекс.Метрику только после согласия, чтобы
            понимать, какие разделы продукта нужно улучшать. Отказ не влияет
            на технические cookies авторизации. Выбор можно изменить, очистив
            данные сайта в браузере.
            <a
              href="/privacy"
              className="ml-1 font-medium text-indigo-500 transition-colors hover:text-indigo-400"
            >
              Политика конфиденциальности
            </a>
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={rejectCookies}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition-all hover:border-slate-400 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          >
            Отказаться
          </button>
          <button
            type="button"
            onClick={acceptCookies}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-500 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 active:scale-95"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
