import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
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
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const navigate = useNavigate();
  const toDemoLogin = useToDemoLogin();
  const startRoute = useStartRoute();
  const navLinks = [
    { href: "#about", label: "О проекте" },
    { href: "#faq", label: "FAQ" },
    { href: "#pricing", label: "Цены" },
  ];
  const faqItems = [
    {
      question: "Можно ли попробовать Glowy без регистрации?",
      answer:
        "Да. Демо-режим дает быстро проверить Хаб мыслей и понять, как ИИ превращает хаотичный текст в задачи. При этом количество демо-запросов ограничено.",
    },
    {
      question: "Что сохраняется после регистрации?",
      answer:
        "После регистрации сохраняются задачи, прогресс, уровни, настройки интерфейса и история работы с приложением. Можно спокойно возвращаться к плану позже.",
    },
    {
      question: "Чем Glowy отличается от обычного списка дел?",
      answer:
        "Glowy делает акцент не только на сроках, но и на энергозатратности. Приложение помогает распределять силы, а не просто набивать день задачами.",
    },
    {
      question: "Что умеет Хаб мыслей?",
      answer:
        "В режиме задач он разбирает текст на конкретные дела с датами, категориями, приоритетом и уровнем энергии. В режиме диалога он отвечает как спокойный ИИ-коуч.",
    },
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
            <div className="flex min-w-0 shrink-0 items-center gap-3 pr-2">
              <img
                src="/Glowy.png"
                alt="Glowy"
                width={40}
                height={40}
                decoding="async"
                fetchPriority="high"
                className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
              />
              <span className="whitespace-nowrap pr-1 font-display text-xl font-black italic leading-none text-indigo-400 sm:text-2xl">
                GLOWY<span className="text-slate-100">.AI</span>
              </span>
            </div>

            <nav
              className="hidden items-center gap-12 text-sm font-semibold text-slate-300 lg:flex xl:gap-16"
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
                  <img
                    src="/Glowy.png"
                    alt="Glowy"
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10"
                  />
                  <span className="whitespace-nowrap pr-1 font-display text-2xl font-black italic leading-none text-indigo-400">
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
              <div className="w-full max-w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl backdrop-blur sm:rounded-4xl sm:p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15">
                    <img
                      src="/Glowy.png"
                      alt=""
                      width={32}
                      height={32}
                      loading="eager"
                      decoding="async"
                      className="h-8 w-8"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold sm:text-xl">
                      Пункт управления
                    </p>
                    <p className="text-sm text-slate-400">Демо-пространство Glowy</p>
                  </div>
                </div>

                <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                  <p className="mb-3 text-sm font-semibold text-indigo-200">
                    Хаб мыслей
                  </p>
                  <p className="rounded-xl bg-slate-950/60 p-3 text-sm leading-6 text-slate-300">
                    “Подготовить первый фокус-блок, разобрать входящие мысли в
                    Хабе и проверить энергопотенциал дня.”
                  </p>
                </div>

                <div className="grid gap-4">
                  <ShowcaseTaskCard
                    title="Подготовить первый фокус-блок"
                    category="Работа"
                    priority="Высокий"
                    accent="red"
                    progress={{ done: 2, total: 4 }}
                  />
                  <ShowcaseTaskCard
                    title="Разобрать входящие мысли в Хабе"
                    category="Glowy"
                    priority="Средний"
                    accent="amber"
                  />
                  <ShowcaseTaskCard
                    title="Проверить энергопотенциал дня"
                    category="Здоровье"
                    priority="Средний"
                    accent="amber"
                    completed
                    xp="+24 XP"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 pb-10 lg:grid-cols-2">
            <section
              id="faq"
              className="scroll-mt-24 rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <h2 className="font-display text-xl font-bold text-white">
                Часто задаваемые вопросы
              </h2>
              <div className="mt-4 grid gap-3">
                {faqItems.map((item, index) => {
                  const isOpen = openFaqIndex === index;

                  return (
                    <div
                      key={item.question}
                      className="rounded-2xl border border-slate-800 bg-slate-950/45"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-bold text-slate-100 transition-colors hover:text-indigo-200"
                        aria-expanded={isOpen}
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-indigo-300 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="px-4 pb-4 text-sm leading-6 text-slate-400">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              id="pricing"
              className="scroll-mt-24 rounded-3xl border border-indigo-400/30 bg-indigo-500/10 p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
                    Ранний доступ
                  </p>
                  <h2 className="mt-2 font-display text-xl font-bold text-white">
                    Цены
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                  Сейчас бесплатно
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-indigo-300/20 bg-slate-950/35 p-4">
                  <p className="font-bold text-white">Бесплатно</p>
                  <p className="mt-1 font-display text-3xl font-black text-indigo-200">
                    0 ₽
                  </p>
                  <p className="mt-3 text-sm leading-6 text-indigo-100/75">
                    В ранней версии можно бесплатно вести задачи, сохранять
                    прогресс и пользоваться Хабом мыслей с дневными лимитами.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700/70 bg-slate-950/25 p-4">
                  <p className="font-bold text-white">Подписки появятся позже</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Pro-тарифы откроют больше ИИ-запросов, расширенную аналитику,
                    премиальные модели и дополнительные инструменты для
                    бережного планирования.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <footer className="relative z-10 flex flex-col gap-5 border-t border-slate-800 py-6 text-sm text-slate-500 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1">
              <span>Версия: v1.5.5</span>
              <span>Поддержка: contact@example.test</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <a
                href="https://t.me/glowy_ai"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-300 transition-colors hover:text-indigo-200"
              >
                Новости проекта в Telegram
              </a>
              <Link to="/terms" className="transition-colors hover:text-slate-200">
                Условия использования
              </Link>
              <Link to="/privacy" className="transition-colors hover:text-slate-200">
                Политика конфиденциальности
              </Link>
              <Link
                to="/personal-data-consent"
                className="transition-colors hover:text-slate-200"
              >
                Согласие на обработку данных
              </Link>
              <Link to="/offer" className="transition-colors hover:text-slate-200">
                Публичная оферта
              </Link>
              <Link to="/refund-policy" className="transition-colors hover:text-slate-200">
                Условия возврата
              </Link>
              <Link to="/contacts" className="transition-colors hover:text-slate-200">
                Контакты
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

const accentClasses = {
  red: {
    line: "bg-red-500",
    badge: "border-red-400/80 bg-red-500/10 text-red-100",
  },
  amber: {
    line: "bg-amber-400",
    badge: "border-amber-400/80 bg-amber-400/10 text-amber-100",
  },
} as const;

const ShowcaseTaskCard = ({
  title,
  category,
  priority,
  accent,
  progress,
  completed = false,
  xp,
}: {
  title: string;
  category: string;
  priority: string;
  accent: keyof typeof accentClasses;
  progress?: { done: number; total: number };
  completed?: boolean;
  xp?: string;
}) => {
  const colors = accentClasses[accent];
  const progressPercent = progress
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 pl-5 ${
        completed ? "opacity-65" : ""
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${colors.line}`} />

      <div className="flex items-start gap-3">
        <div
          className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
            completed
              ? "border-emerald-300 bg-emerald-400/15 text-emerald-200"
              : "border-slate-500"
          }`}
          aria-hidden="true"
        >
          {completed ? <CheckCircle2 size={16} /> : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`truncate text-lg font-bold leading-tight text-slate-100 ${
                  completed ? "line-through decoration-slate-400/60" : ""
                }`}
              >
                {title}
              </p>
              <p className="mt-1 text-sm text-slate-400">2026-06-10</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={`rounded-xl border px-3 py-1.5 text-sm font-black ${colors.badge}`}
              >
                {priority}
              </span>
              {xp ? (
                <span className="rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-sm font-black text-emerald-200 shadow-[0_0_22px_rgba(52,211,153,0.25)]">
                  {xp}
                </span>
              ) : null}
            </div>
          </div>

          {progress ? (
            <div className="mt-3 max-w-52">
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-indigo-200">
                <span>Подзадачи</span>
                <span>
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700/80">
                <div
                  className="h-full rounded-full bg-indigo-400 shadow-[0_0_14px_rgba(129,140,248,0.45)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-100">
              {category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
