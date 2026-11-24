import { Link } from "react-router-dom";
import { useTaskStore } from "../store/useTaskStore";
import { useAuthStore } from "../store/useAuthStore";
import { EnergySlider } from "../components/layout/EnergySlider";
import MindHubChat from "../components/mind/MindHubChat";
import ReadOnlyTaskCard from "../components/tasks/ReadOnlyTaskCard";
import { useProgressOverview } from "../queries/progress/progressQueries";
import { formatLocalDateOnly } from "../utils/localDate";

const dayCount = new Intl.NumberFormat("ru", {
  style: "unit",
  unit: "day",
  unitDisplay: "long",
});

const DashboardPage = () => {
  const currentLevel = useTaskStore((state) => state.userLevel);
  const userName = useAuthStore((state) => state.name);
  const currentEnergy = useAuthStore((state) => state.currentEnergy);
  const tasks = useTaskStore((state) => state.tasks);
  const isGuest = useAuthStore((state) => state.isGuest);

  const userId = useAuthStore((state) => state.userId);
  const sessionKey = useAuthStore((state) => state.token ?? "guest");
  const today = formatLocalDateOnly();
  const todayTasks = tasks.filter((task) => !task.completed && task.date === today);
  const progress = useProgressOverview({
    userId,
    today,
    month: today.slice(0, 7),
    enabled: isGuest || userId !== null,
    isGuest,
    sessionKey,
    taskRevision: isGuest ? JSON.stringify(tasks) : undefined,
  });
  const streak = progress.data?.taskStreak.current;

  const renderTodaySection = () => (
    <section className="flex min-h-64 min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
          Сегодня
        </h2>
        <Link
          to="/tasks"
          className="text-sm font-bold text-indigo-500 transition-colors hover:text-indigo-400"
        >
          Все
        </Link>
      </div>

      {todayTasks.length > 0 ? (
        <div className="custom-scrollbar max-h-96 space-y-3 overflow-y-auto pr-2">
          {todayTasks.map((task) => (
            <ReadOnlyTaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          На сегодня нет активных задач.
        </p>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Привет, {userName || "друг"}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Уровень {currentLevel} · Энергия {currentEnergy}%
            </p>
          </div>
          {currentEnergy <= 20 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
              Низкий заряд — лучше выбрать лёгкую задачу
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {renderTodaySection()}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
            <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
              Серия побед
            </h2>
            {streak !== undefined ? (
              <p className="mt-3 text-3xl font-bold text-indigo-600 dark:text-indigo-300">
                {dayCount.format(streak)} подряд
              </p>
            ) : (
              <p role="status" className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {progress.fetchStatus === "fetching" ? "Загружаем серию…" : "Серия пока недоступна."}
              </p>
            )}
            <Link
              to="/progress?tab=streak"
              className="mt-4 inline-flex text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-300"
            >
              Весь прогресс
            </Link>
          </section>
          <EnergySlider />
        </div>
      </div>

      <div className="hidden lg:block">
        <MindHubChat />
      </div>
    </div>
  );
};

export default DashboardPage;
