import axios from "axios";
import { useState, type FormEvent, type MouseEvent } from "react";
import { TelegramMiniAppApi, type TelegramMiniAppUser } from "../../api/TelegramMiniAppApi";
import { useTelegramMiniApp } from "../../telegram/telegramMiniAppContext";
import { openTelegramExternalLink } from "../../telegram/telegramExternalLink";

type Mode = "register" | "login";

const TelegramMiniAppAuth = ({
  initData,
  onAuthenticated,
}: {
  initData: string;
  onAuthenticated: (user: TelegramMiniAppUser) => void;
}) => {
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { webApp } = useTelegramMiniApp();

  const openLegal = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    openTelegramExternalLink(event.currentTarget.href, webApp);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "register" && !accepted) return;
    setWorking(true);
    setError(null);
    try {
      const user =
        mode === "register"
          ? await TelegramMiniAppApi.register({ initData, name, email, password })
          : await TelegramMiniAppApi.login({ initData, email, password });
      onAuthenticated(user);
    } catch (caught) {
      setError(
        axios.isAxiosError(caught)
          ? caught.response?.data?.error || "Не удалось продолжить. Попробуйте ещё раз."
          : "Не удалось продолжить. Попробуйте ещё раз."
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <main
      className="flex min-h-[var(--tg-viewport-height,100dvh)] items-center justify-center overflow-x-hidden px-4 py-8 text-slate-100"
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #020617)",
        color: "var(--tg-theme-text-color, #f8fafc)",
        paddingTop: "max(2rem, var(--tg-content-safe-area-inset-top, 0px))",
        paddingBottom: "max(2rem, var(--tg-content-safe-area-inset-bottom, 0px))",
      }}
    >
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl sm:p-7">
        <img src="/Glowy.png" alt="Glowy" className="mx-auto h-14 w-14 object-contain" />
        <h1 className="mt-3 text-center font-display text-2xl font-black">
          {mode === "register" ? "Создать аккаунт Glowy" : "Войти в Glowy"}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-400">
          Всё происходит внутри Telegram. Профиль привяжется автоматически.
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-950 p-1" role="tablist">
          {(["register", "login"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => { setMode(value); setError(null); }}
              className={`min-h-11 rounded-lg px-3 text-sm font-bold ${
                mode === value ? "bg-indigo-600 text-white" : "text-slate-400"
              }`}
            >
              {value === "register" ? "Регистрация" : "Вход"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "register" && (
            <label className="block text-sm font-semibold text-slate-300">
              Имя
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={100}
                required
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base outline-none focus:border-indigo-500"
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-300">
            Почта
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-300">
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={mode === "register" ? 8 : undefined}
              maxLength={mode === "register" ? 20 : undefined}
              required
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base outline-none focus:border-indigo-500"
            />
          </label>

          {mode === "register" && (
            <label className="flex items-start gap-3 text-xs leading-5 text-slate-400">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                Я принимаю <a href="/terms" onClick={openLegal} className="text-indigo-300">условия</a>,{" "}
                <a href="/privacy" onClick={openLegal} className="text-indigo-300">политику конфиденциальности</a> и{" "}
                <a href="/personal-data-consent" onClick={openLegal} className="text-indigo-300">согласие на обработку данных</a>.
              </span>
            </label>
          )}

          {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={working || (mode === "register" && !accepted)}
            className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-bold text-white disabled:opacity-50"
          >
            {working ? "Проверяем..." : mode === "register" ? "Создать аккаунт" : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default TelegramMiniAppAuth;
