import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Gauge,
  LogIn,
  Menu,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";
import type { Task } from "../types";
import { useToDemoLogin } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import { useStartRoute } from "../store/useSettingsStore";

const demoTaskPool: Array<Omit<Task, "id">> = [
  {
    title: "Разобрать входящие мысли в Хабе",
    date: new Date().toISOString().slice(0, 10),
    priority: "⚡️ P2",
    category: "Glowy",
    completed: false,
    xpAwarded: false,
    energyLevel: "med",
    subtasks: [],
  },
  {
    title: "Подготовить первый фокус-блок",
    date: new Date().toISOString().slice(0, 10),
    priority: "🔥 P1",
    category: "Работа",
    completed: false,
    xpAwarded: false,
    energyLevel: "high",
    subtasks: [],
  },
  {
    title: "Запланировать короткий перерыв",
    date: new Date().toISOString().slice(0, 10),
    priority: "💤 P3",
    category: "Быт",
    completed: false,
    xpAwarded: false,
    energyLevel: "low",
    subtasks: [],
  },
  {
    title: "Проверить энергопотенциал дня",
    date: new Date().toISOString().slice(0, 10),
    priority: "⚡️ P2",
    category: "Здоровье",
    completed: false,
    xpAwarded: false,
    energyLevel: "med",
    subtasks: [],
  },
  {
    title: "Сформулировать одну важную цель",
    date: new Date().toISOString().slice(0, 10),
    priority: "🔥 P1",
    category: "Учеба",
    completed: false,
    xpAwarded: false,
    energyLevel: "high",
    subtasks: [],
  },
];

const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const toDemoLogin = useToDemoLogin();
  const startRoute = useStartRoute();
  const navLinks = [
    { href: "#about", label: "О проекте" },
    { href: "#faq", label: "FAQ" },
    { href: "#pricing", label: "Цены" },
  ];

  const handleDemoLogin = () => {
    const shuffledTasks = [...demoTaskPool].sort(() => Math.random() - 0.5);
    const demoTasks = shuffledTasks.slice(0, 3).map((task, index) => ({
      ...task,
      id: Date.now() + index,
      subtasks: [],
    }));

    toDemoLogin();
    useTaskStore.getState().setTasks(demoTasks);
    useTaskStore.getState().setUserProgress({ xp: 40, level: 1 });
    navigate(startRoute);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <section className="relative flex min-h-screen flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.25),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/Glowy.png"
                alt="Glowy"
                className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
              />
              <span className="truncate font-display text-xl font-black italic text-indigo-400 sm:text-2xl">
                GLOWY<span className="text-slate-100">.AI</span>
              </span>
            </div>

            <nav
              className="hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex"
              aria-label="Публичная навигация"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 sm:flex">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400 hover:text-white"
              >
                <LogIn size={16} />
                Войти
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-[0_0_22px_rgba(79,70,229,0.3)] transition-colors hover:bg-indigo-500"
              >
                Регистрация
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 text-slate-100 transition-colors hover:border-indigo-400 sm:hidden"
              aria-label="Открыть меню"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu size={22} />
            </button>
          </header>

          <div
            className={`fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
              isMobileMenuOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isMobileMenuOpen}
            onClick={closeMobileMenu}
          >
            <aside
              className={`ml-auto flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950 p-5 shadow-2xl transition-transform duration-300 ${
                isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/Glowy.png" alt="Glowy" className="h-10 w-10" />
                  <span className="font-display text-2xl font-black italic text-indigo-400">
                    GLOWY<span className="text-slate-100">.AI</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 text-slate-300 transition-colors hover:border-indigo-400 hover:text-white"
                  aria-label="Закрыть меню"
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="mt-12 flex flex-col gap-3" aria-label="Мобильная публичная навигация">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-xl font-bold text-slate-100 transition-colors hover:border-indigo-400"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="mt-auto grid gap-3 pb-2">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-4 font-bold text-slate-100 transition-colors hover:border-indigo-400"
                >
                  <LogIn size={18} />
                  Войти
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-[0_0_28px_rgba(79,70,229,0.35)] transition-colors hover:bg-indigo-500"
                >
                  Регистрация
                </Link>
              </div>
            </aside>
          </div>

          <div className="grid flex-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-w-0">
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 sm:px-4 sm:text-sm">
                <Sparkles size={16} className="shrink-0" />
                <span className="min-w-0 whitespace-normal">
                  Таск-трекер, который бережет энергию
                </span>
              </div>
              <h1 className="max-w-4xl text-wrap font-display text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-7xl">
                Превращай хаос мыслей в спокойный план дня
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Glowy помогает выгрузить дела из головы, оценить
                энергозатратность задач и двигаться без перегруза. ИИ-ассистент
                разбирает мысли, создает задачи и подсказывает мягкий фокус.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-[0_0_28px_rgba(79,70,229,0.35)] transition-colors hover:bg-indigo-500 sm:w-auto sm:px-6"
                >
                  Регистрация
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 font-bold text-slate-100 transition-colors hover:border-indigo-400 sm:w-auto sm:px-6"
                >
                  <LogIn size={18} />
                  Войти
                </Link>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-100 transition-colors hover:bg-cyan-400/15 sm:w-auto sm:px-6"
                >
                  <PlayCircle size={18} />
                  Демо-вход
                </button>
              </div>

              <div id="about" className="mt-10 grid max-w-3xl scroll-mt-24 grid-cols-1 gap-4 sm:grid-cols-3">
                <Feature icon={Brain} title="Хаб мыслей" text="ИИ разбирает поток мыслей на задачи." />
                <Feature icon={Gauge} title="Энергия" text="День планируется с учетом сил." />
                <Feature icon={CheckCircle2} title="Фокус" text="Активные задачи остаются в центре." />
              </div>
            </div>

            <div className="relative min-w-0">
              <div className="w-full max-w-full rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4 shadow-2xl backdrop-blur sm:rounded-[2rem] sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15">
                    <img src="/Glowy.png" alt="" className="h-8 w-8" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold sm:text-xl">
                      Пункт управления
                    </p>
                    <p className="text-sm text-slate-400">Демо-пространство Glowy</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                    <p className="mb-3 text-sm font-semibold text-indigo-200">
                      Хаб мыслей
                    </p>
                    <p className="rounded-xl bg-slate-950/60 p-3 text-sm leading-6 text-slate-300">
                      “Нужно подготовиться к тесту, купить продукты и не забыть
                      ответить преподавателю...”
                    </p>
                  </div>
                  {[
                    ["🔥 P1", "Ответить преподавателю", "Учеба"],
                    ["⚡️ P2", "Подготовиться к тесту", "Фокус"],
                    ["💤 P3", "Купить продукты", "Быт"],
                  ].map(([priority, title, category]) => (
                    <div
                      key={title}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border-l-4 border-l-indigo-500 bg-slate-800/70 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100">
                          {title}
                        </p>
                        <p className="text-xs text-slate-400">{category}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-slate-700 px-2 py-1 text-sm">
                        {priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 pb-10 lg:grid-cols-2">
            <section
              id="faq"
              className="scroll-mt-24 rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <h2 className="font-display text-xl font-bold text-white">FAQ</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-400">
                <p>
                  Glowy можно попробовать без регистрации: демо-режим покажет,
                  как Хаб мыслей превращает текст в задачи.
                </p>
                <p>
                  Зарегистрированный аккаунт сохраняет задачи, прогресс, уровни
                  и настройки между устройствами.
                </p>
              </div>
            </section>

            <section
              id="pricing"
              className="scroll-mt-24 rounded-3xl border border-indigo-400/30 bg-indigo-500/10 p-5"
            >
              <h2 className="font-display text-xl font-bold text-white">Цены</h2>
              <p className="mt-4 text-sm leading-6 text-indigo-100/80">
                Сейчас Glowy доступен бесплатно в рамках ранней версии. Демо
                ограничено по количеству ИИ-запросов, а регистрация открывает
                полноценное сохранение задач.
              </p>
            </section>
          </div>

          <footer className="relative z-10 flex flex-col gap-5 border-t border-slate-800 py-6 text-sm text-slate-500 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1">
              <span>Версия: v1.4.0</span>
              <span>Поддержка: contact@example.test</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <a
                href="https://t.me/glowy_ai"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-300 transition-colors hover:text-indigo-200"
              >
                Новости проекта в Telegram (@glowy_ai)
              </a>
              <Link to="/privacy" className="transition-colors hover:text-slate-200">
                Политика конфиденциальности
              </Link>
              <Link to="/terms" className="transition-colors hover:text-slate-200">
                Условия использования
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
};

const Feature = ({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  text: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <Icon size={20} className="mb-3 text-indigo-300" />
    <p className="font-semibold text-slate-100">{title}</p>
    <p className="mt-1 text-sm leading-5 text-slate-400">{text}</p>
  </div>
);

export default LandingPage;
