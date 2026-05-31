import { Link, useNavigate } from "react-router-dom";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Gauge,
  LogIn,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { Task } from "../types";
import { useToDemoLogin } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";

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
  const navigate = useNavigate();
  const toDemoLogin = useToDemoLogin();

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
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <section className="relative flex min-h-screen flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.25),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.18),transparent_30%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-6 lg:px-8">
          <header className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/Glowy.png"
                alt="Glowy"
                className="h-10 w-10 object-contain"
              />
              <span className="font-display text-2xl font-black italic text-indigo-400">
                GLOWY<span className="text-slate-100">.AI</span>
              </span>
            </Link>
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400 hover:text-white sm:flex"
            >
              <LogIn size={16} />
              Войти
            </Link>
          </header>

          <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200">
                <Sparkles size={16} />
                Таск-трекер, который бережет энергию
              </div>
              <h1 className="font-display max-w-4xl text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">
                Превращай хаос мыслей в спокойный план дня
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Glowy помогает выгрузить дела из головы, оценить
                энергозатратность задач и двигаться без перегруза. ИИ-ассистент
                разбирает мысли, создает задачи и подсказывает мягкий фокус.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-[0_0_28px_rgba(79,70,229,0.35)] transition-colors hover:bg-indigo-500"
                >
                  Регистрация
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-6 py-3 font-bold text-slate-100 transition-colors hover:border-indigo-400"
                >
                  <LogIn size={18} />
                  Войти
                </Link>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-6 py-3 font-bold text-cyan-100 transition-colors hover:bg-cyan-400/15"
                >
                  <PlayCircle size={18} />
                  Демо-вход
                </button>
              </div>

              <div className="mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                <Feature icon={Brain} title="Хаб мыслей" text="ИИ разбирает поток мыслей на задачи." />
                <Feature icon={Gauge} title="Энергия" text="День планируется с учетом сил." />
                <Feature icon={CheckCircle2} title="Фокус" text="Активные задачи остаются в центре." />
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15">
                    <img src="/Glowy.png" alt="" className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold">Пункт управления</p>
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
                      className="flex items-center justify-between rounded-2xl border-l-4 border-l-indigo-500 bg-slate-800/70 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">{title}</p>
                        <p className="text-xs text-slate-400">{category}</p>
                      </div>
                      <span className="rounded-lg bg-slate-700 px-2 py-1 text-sm">
                        {priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer className="relative z-10 flex flex-col gap-3 border-t border-slate-800 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Glowy.AI</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-slate-200">
                Политика конфиденциальности
              </Link>
              <Link to="/terms" className="hover:text-slate-200">
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
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <Icon size={20} className="mb-3 text-indigo-300" />
    <p className="font-semibold text-slate-100">{title}</p>
    <p className="mt-1 text-sm leading-5 text-slate-400">{text}</p>
  </div>
);

export default LandingPage;
