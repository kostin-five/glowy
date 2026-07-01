import { useState } from "react";
import { Info, X } from "lucide-react";
import SuccessStairs from "../dashboard/SuccessStairs";
import { useCurrentXP, useTasks, useUserLevel } from "../store/useTaskStore";
import type { Task } from "../types";
import { getLevelProgress, getXpReward } from "../utils/xp";
import { parseTaskDateToLocalDay } from "../utils/taskDateGroups";

type TaskWithTimestamps = Task & {
  createdAt?: string;
  updatedAt?: string;
};

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getTaskActivityDate = (task: TaskWithTimestamps): Date | null => {
  const timestamp = task.updatedAt || task.createdAt;

  if (timestamp) {
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return parseTaskDateToLocalDay(task.date);
};

const SuccessStairsPage = () => {
  const currentLevel = useUserLevel();
  const currentXP = useCurrentXP();
  const tasks = useTasks() as TaskWithTimestamps[];
  const progress = getLevelProgress(currentXP, currentLevel);
  const [isXpHelpOpen, setIsXpHelpOpen] = useState(false);
  const today = new Date();
  const todayXp = tasks.reduce((sum, task) => {
    if (!task.completed || !task.xpAwarded) return sum;

    const activityDate = getTaskActivityDate(task);
    if (!activityDate || !isSameLocalDay(activityDate, today)) return sum;

    return sum + getXpReward(task.energyLevel, task.priority);
  }, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 md:px-8 lg:pb-8">
      <div>
        <h1 className="font-display text-3xl font-black text-slate-900 dark:text-slate-100 md:text-4xl">
          Лестница прогресса
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
          Бесконечная прогрессия Glowy: сохраняй баланс, грамотно расходуй силы
          и получай XP за осознанно выполненные задачи.
        </p>
      </div>

      <section className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-12">
        <section className="min-h-110 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none sm:col-span-7 sm:min-h-125 sm:p-6 xl:min-h-150">
          <SuccessStairs currentLevel={currentLevel} visibleSteps={7} />
        </section>

        <div className="flex flex-col gap-4 sm:col-span-5 sm:grid sm:h-full sm:grid-rows-2">
          <section className="flex min-h-0 flex-col justify-between gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none sm:p-6 xl:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-400 xl:text-base">
                  Текущий уровень
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <span className="font-display text-6xl font-black leading-none text-indigo-300 xl:text-7xl">
                    {currentLevel}
                  </span>
                  <span className="pb-2 text-lg font-bold text-slate-600 dark:text-slate-400 xl:pb-3 xl:text-xl">
                    {currentXP} XP всего
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsXpHelpOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400 xl:h-14 xl:w-14 xl:rounded-2xl"
                aria-label="Как начисляется XP"
              >
                <Info size={22} />
              </button>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400 xl:text-base">
                <span>До уровня {currentLevel + 1}</span>
                <span className="font-semibold text-indigo-300">
                  {progress.earnedInsideLevel}/{progress.requiredInsideLevel} XP
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 xl:h-5">
                <div
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 to-cyan-400 shadow-[0_0_18px_rgba(99,102,241,0.55)] transition-all duration-500"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col justify-center rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-slate-900 dark:text-slate-100 sm:p-6 xl:p-7">
            <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-300 xl:text-base">
              XP за сегодня
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <span className="font-display text-5xl font-black leading-none text-indigo-300 xl:text-7xl">
                {todayXp}
              </span>
              <span className="pb-2 text-lg font-bold text-slate-600 dark:text-slate-400 xl:pb-3 xl:text-xl">
                XP заработано
              </span>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-600 dark:text-slate-400 xl:text-base xl:leading-7">
              Считаются задачи, за которые XP уже начислен сегодня.
            </p>
          </section>
        </div>
      </section>

      {isXpHelpOpen && (
        <div
          className="fixed inset-0 z-60 flex items-end bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="xp-help-title"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="xp-help-title"
                  className="font-display text-2xl font-black text-slate-900 dark:text-slate-100"
                >
                  Как начисляется XP
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  XP начисляется один раз при первом выполнении задачи.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsXpHelpOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Закрыть подсказку"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Лёгкая задача
                </p>
                <p className="font-display text-3xl font-black text-emerald-300">
                  10 XP
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Средняя нагрузка
                </p>
                <p className="font-display text-3xl font-black text-amber-300">
                  20 XP
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Высокая энергия
                </p>
                <p className="font-display text-3xl font-black text-red-300">
                  30 XP
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Приоритет добавляет небольшой бонус: P1 x1.5, P2 x1.2, P3 x1.0.
              Если задачу вернуть в активные и выполнить снова, XP повторно не
              начисляется.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessStairsPage;
