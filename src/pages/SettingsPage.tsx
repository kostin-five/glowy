import { Mail, Moon, ShieldCheck, Sun } from "lucide-react";
import { useIsDarkMode, useToggleDarkMode } from "../store/useSettingsStore";

const SettingsPage = () => {
  const isDarkMode = useIsDarkMode();
  const toggleDarkMode = useToggleDarkMode();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 md:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-950 dark:text-slate-100 md:text-4xl">
          Настройки
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
          Настрой внешний вид приложения и найди контакты для связи с
          поддержкой.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
              {isDarkMode ? <Moon size={22} /> : <Sun size={22} />}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
                Темная тема
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Переключай интерфейс под вечернюю работу или яркий дневной
                экран.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            onClick={toggleDarkMode}
            className={`relative h-9 w-17 shrink-0 rounded-full border p-1 transition-colors ${
              isDarkMode
                ? "border-indigo-400/40 bg-indigo-600"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-transform ${
                isDarkMode ? "translate-x-8" : "translate-x-0"
              }`}
            >
              {isDarkMode ? <Moon size={15} /> : <Sun size={15} />}
            </span>
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-950 dark:text-slate-100">
                Поддержка
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Если что-то сломалось или хочется предложить улучшение, напиши
                нам.
              </p>
            </div>
          </div>

          <a
            href="mailto:contact@example.test"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Mail size={17} />
            contact@example.test
          </a>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
