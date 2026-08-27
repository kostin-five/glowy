import { useEffect, useState } from "react";
import { ExternalLink, Link2, Send, Unlink } from "lucide-react";
import { UserApi } from "../../api/UserApi";
import type { TelegramConnectionStatus, TelegramLinkCode } from "../../types";

const TelegramConnectionPanel = () => {
  const [status, setStatus] = useState<TelegramConnectionStatus | null>(null);
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await UserApi.getTelegramConnection());
    } catch {
      setError("Не удалось загрузить подключение Telegram.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    UserApi.getTelegramConnection()
      .then((connectionStatus) => {
        if (active) setStatus(connectionStatus);
      })
      .catch(() => {
        if (active) setError("Не удалось загрузить подключение Telegram.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const createCode = async () => {
    setWorking(true);
    setError(null);
    try {
      setLinkCode(await UserApi.createTelegramLinkCode());
    } catch {
      setError("Не удалось создать код. Попробуй ещё раз.");
    } finally {
      setWorking(false);
    }
  };

  const unlink = async () => {
    setWorking(true);
    setError(null);
    try {
      await UserApi.unlinkTelegram();
      setLinkCode(null);
      setConfirmUnlink(false);
      await loadStatus();
    } catch {
      setError("Не удалось отключить Telegram. Попробуй ещё раз.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section
      id="connections"
      className="min-w-0 scroll-mt-28 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none sm:p-5 md:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-500 dark:text-sky-300">
          <Send size={22} aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
            Telegram
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Открывай полный Glowy внутри Telegram и используй быстрые команды бота.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Проверяем подключение...</p>
      ) : !status?.available ? (
        <p className="mt-5 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
          Telegram-бот пока не настроен для этого окружения.
        </p>
      ) : status.connected ? (
        <div className="mt-5 rounded-2xl border border-emerald-300/50 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
          <p className="font-bold text-emerald-800 dark:text-emerald-200">Telegram подключён</p>
          <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-100/70">
            Mini App и команды работают с этим же аккаунтом, задачами и тарифом Glowy.
          </p>
          {confirmUnlink ? (
            <div className="mt-4">
              <p className="text-xs leading-5 text-slate-600 dark:text-slate-300 sm:basis-full">
                Аккаунт и данные Glowy сохранятся. Доступ из Telegram прекратится сразу.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setConfirmUnlink(false)} disabled={working} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200">
                  Оставить подключение
                </button>
                <button type="button" onClick={() => void unlink()} disabled={working} className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {working ? "Отключаем..." : "Да, отключить"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmUnlink(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:text-rose-300">
              <Unlink size={16} /> Отключить Telegram
            </button>
          )}
        </div>
      ) : linkCode ? (
        <div className="mt-5 rounded-2xl border border-sky-300/50 bg-sky-50 p-4 dark:border-sky-400/20 dark:bg-sky-500/10">
          <p className="text-sm font-bold text-sky-900 dark:text-sky-100">Одноразовый код</p>
          <p className="mt-2 select-all font-mono text-xl font-bold tracking-wider text-slate-950 dark:text-white">
            {linkCode.code}
          </p>
          <p className="mt-2 text-sm text-sky-800/80 dark:text-sky-100/70">
            Код действует до {new Date(linkCode.expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} и сработает один раз.
          </p>
          <a href={linkCode.deepLink} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500">
            Открыть бота <ExternalLink size={16} />
          </a>
        </div>
      ) : (
        <div className="mt-5">
          <button type="button" onClick={() => void createCode()} disabled={working} className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-60">
            <Link2 size={17} /> {working ? "Создаём код..." : "Подключить Telegram"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Бот не получает пароль или cookie в сообщениях. Одноразовый код — дополнительный способ привязки с сайта.
          </p>
        </div>
      )}
    </section>
  );
};

export default TelegramConnectionPanel;
