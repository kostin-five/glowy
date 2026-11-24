import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Sparkles } from "lucide-react";
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const openChat = () => {
    setHasOpenedChat(true);
    setIsChatOpen(true);
  };
  const closeChat = () => setIsChatOpen(false);

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
          <button
            type="button"
            onClick={openChat}
            aria-haspopup="dialog"
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-left font-bold text-indigo-700 transition-colors hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/25"
          >
            <Sparkles size={20} aria-hidden="true" />
            ИИ-ассистент
          </button>
        </div>
      </div>

      {hasOpenedChat && (
        <Dialog open={isChatOpen} onClose={closeChat} unmount={false} className="fixed inset-0 z-50">
          <DialogBackdrop className="fixed inset-0 bg-slate-950/70" />
          <div className="fixed inset-0 flex justify-end sm:p-3">
            <DialogPanel className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900 sm:h-full sm:max-w-2xl sm:rounded-3xl sm:border sm:border-slate-200 dark:sm:border-slate-700">
              <DialogTitle className="sr-only">ИИ-ассистент</DialogTitle>
              <MindHubChat variant="drawer" onClose={closeChat} />
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default DashboardPage;
