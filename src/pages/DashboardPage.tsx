import { useRef, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTaskStore } from "../store/useTaskStore";
import { useAuthStore } from "../store/useAuthStore";
import { EnergySlider } from "../components/layout/EnergySlider";
import MindHubChat from "../components/mind/MindHubChat";
import useMediaQuery from "../hooks/useMediaQuery";
import ReadOnlyTaskCard from "../components/tasks/ReadOnlyTaskCard";
import DayPlanReviewDialog from "../components/dashboard/DayPlanReviewDialog";
import { buildDayPlan } from "../dashboard/dayPlan";
import { trackProductEvent } from "../utils/analytics";

const getTodayLocalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const DashboardPage = () => {
  const currentLevel = useTaskStore((state) => state.userLevel);
  const userName = useAuthStore((state) => state.name);
  const currentEnergy = useAuthStore((state) => state.currentEnergy);
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);

  const { todayTasks, dayPlan } = useMemo(() => {
    const active = tasks.filter((t) => !t.completed);
    const todayStr = getTodayLocalDate();
    const today = active.filter((t) => t.date === todayStr);

    return {
      todayTasks: today,
      dayPlan: buildDayPlan(active, currentEnergy, todayStr),
    };
  }, [tasks, currentEnergy]);
  const mindHubInputRef = useRef<HTMLTextAreaElement | null>(null);
  const isDesktopLayout = useMediaQuery("(min-width: 1024px)");

  const focusMindHubInput = () => {
    if (!isDesktopLayout) {
      window.dispatchEvent(new Event("glowy:open-mobile-ai"));
      return;
    }

    mindHubInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    window.requestAnimationFrame(() => mindHubInputRef.current?.focus());
  };

  const openPlan = () => {
    setPlanNotice(null);
    setIsPlanOpen(true);
    trackProductEvent("day_plan_opened");
  };

  const applyPlan = async (selectedTaskIds: number[]) => {
    const today = getTodayLocalDate();
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const failedIds: number[] = [];

    await Promise.all(selectedTaskIds.map(async (taskId) => {
      const task = tasksById.get(taskId);
      if (!task || task.completed) {
        failedIds.push(taskId);
        return;
      }
      if (task.date === today) return;

      try {
        const updated = await updateTask(taskId, { date: today });
        if (!updated) failedIds.push(taskId);
      } catch {
        failedIds.push(taskId);
      }
    }));

    return failedIds;
  };

  const finishPlan = () => {
    setPlanNotice("План на сегодня готов. Начни с первого спокойного шага.");
    trackProductEvent("day_plan_applied");
  };

  const renderFocusSection = () => (
    <section className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
      <div className="custom-scrollbar min-h-0 overflow-y-auto pr-1">
        <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
          Фокус дня
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Лучше начать с
        </p>

        {dayPlan.length > 0 ? (
          <>
            <div className="space-y-3">
              {dayPlan.map((candidate, index) => (
                <div key={candidate.task.id}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-500">
                    {index === 0 ? "Следующий шаг" : "Потом"}
                  </p>
                  <ReadOnlyTaskCard task={candidate.task} />
                  {index === 0 && (
                    <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      {candidate.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {planNotice && (
              <p aria-live="polite" className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm leading-5 text-emerald-700 dark:text-emerald-200">
                {planNotice}
              </p>
            )}
            <button
              type="button"
              onClick={openPlan}
              className="mt-4 min-h-11 w-full rounded-xl border border-indigo-400/50 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-indigo-200"
            >
              Настроить план
            </button>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Задач пока нет. Начни с Разгрузки мыслей: я отвечу и при
              необходимости предложу первый шаг как черновик.
            </p>
            <button
              type="button"
              onClick={focusMindHubInput}
              className="mt-2 text-sm font-bold text-indigo-500 transition-colors hover:text-indigo-400"
            >
              Выгрузить мысли
            </button>
          </div>
        )}
      </div>
    </section>
  );

  const renderTodaySection = () => (
    <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
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
        <div className="custom-scrollbar max-h-80 space-y-3 overflow-y-auto pr-2 xl:max-h-none xl:flex-1">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:items-stretch">
        <div className="xl:col-span-3 flex flex-col gap-6 xl:h-[calc(100vh-12rem)] xl:min-h-160 min-h-0">
          {isDesktopLayout ? renderTodaySection() : renderFocusSection()}

          <EnergySlider />
        </div>

        {isDesktopLayout && (
          <div className="xl:col-span-5">
            <MindHubChat inputRef={mindHubInputRef} />
          </div>
        )}

        <div className="flex min-h-0 flex-col xl:col-span-4 xl:h-[calc(100vh-12rem)]">
          {isDesktopLayout ? renderFocusSection() : renderTodaySection()}
        </div>
      </div>

      {isPlanOpen && (
        <DayPlanReviewDialog
          isOpen
          candidates={dayPlan}
          onClose={() => setIsPlanOpen(false)}
          onApply={applyPlan}
          onApplied={finishPlan}
        />
      )}
    </div>
  );
};

export default DashboardPage;
