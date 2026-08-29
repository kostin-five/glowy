import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, LoaderCircle, X } from "lucide-react";
import { ProgressApi } from "../api/ProgressApi";
import HabitsPanel from "../components/progress/HabitsPanel";
import StreakPanel from "../components/progress/StreakPanel";
import Modal from "../components/ui/Modal";
import FirstUsePopover from "../components/onboarding/FirstUsePopover";
import SuccessStairs from "../dashboard/SuccessStairs";
import { useIsGuest } from "../store/useAuthStore";
import { useCurrentXP, useTasks, useUserLevel } from "../store/useTaskStore";
import type { Habit, ProgressOverview, Task } from "../types";
import { trackProductEvent } from "../utils/analytics";
import { formatLocalDateOnly } from "../utils/localDate";
import { parseTaskDateToLocalDay } from "../utils/taskDateGroups";
import { getLevelProgress, getXpReward } from "../utils/xp";

type ProgressTab = "xp" | "streak" | "habits";
type TaskWithTimestamps = Task & { createdAt?: string; updatedAt?: string };

const PROGRESS_LOAD_ERROR =
  "Не удалось загрузить прогресс. Нажми «Повторить», чтобы попробовать ещё раз.";

const tabs: Array<{ id: ProgressTab; label: string }> = [
  { id: "xp", label: "Уровень и XP" },
  { id: "streak", label: "Стрик побед" },
  { id: "habits", label: "Привычки" },
];

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getTaskActivityDate = (task: TaskWithTimestamps): Date | null => {
  if (task.completedOn) return parseTaskDateToLocalDay(task.completedOn);
  const timestamp = task.updatedAt || task.createdAt;
  if (timestamp) {
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseTaskDateToLocalDay(task.date);
};

const ServerProgressPlaceholder = ({
  isGuest,
  isLoading,
  onRetry,
}: {
  isGuest: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) => (
  <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
    {!isGuest && isLoading && (
      <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        <LoaderCircle className="animate-spin" size={23} />
      </span>
    )}
    <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
      {isGuest
        ? "Прогресс сохраняется в аккаунте"
        : isLoading
          ? "Загружаю прогресс"
          : "Прогресс пока недоступен"}
    </h2>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
      {isGuest
        ? "Войди или зарегистрируйся, чтобы вести стрик, привычки и достижения на всех устройствах."
        : isLoading
          ? "Собираю выполненные задачи и привычки без лишней суеты."
          : "Не получилось получить данные с сервера. Проверь соединение и попробуй ещё раз."}
    </p>
    {!isGuest && !isLoading && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
      >
        Повторить
      </button>
    )}
  </section>
);

const XpPanel = ({
  currentLevel,
  currentXP,
  todayXp,
  onOpenHelp,
}: {
  currentLevel: number;
  currentXP: number;
  todayXp: number;
  onOpenHelp: () => void;
}) => {
  const progress = getLevelProgress(currentXP, currentLevel);

  return (
    <section className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-12">
      <section className="min-h-110 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none sm:col-span-7 sm:min-h-125 sm:p-6 xl:min-h-150">
        <SuccessStairs currentLevel={currentLevel} visibleSteps={6} />
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
              onClick={onOpenHelp}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400"
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
  );
};

const SuccessStairsPage = () => {
  const currentLevel = useUserLevel();
  const currentXP = useCurrentXP();
  const tasks = useTasks() as TaskWithTimestamps[];
  const isGuest = useIsGuest();
  const today = useMemo(() => formatLocalDateOnly(), []);
  const [activeTab, setActiveTab] = useState<ProgressTab>("xp");
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingHabitIds, setPendingHabitIds] = useState<Set<number>>(new Set());
  const [isXpHelpOpen, setIsXpHelpOpen] = useState(false);
  const [isRescueConfirmOpen, setIsRescueConfirmOpen] = useState(false);

  const loadProgress = useCallback(async () => {
    if (isGuest) return;
    setIsLoading(true);
    setError("");
    try {
      setProgress(await ProgressApi.getOverview(today, selectedMonth));
    } catch {
      setError(PROGRESS_LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, selectedMonth, today]);

  useEffect(() => {
    if (isGuest) return;
    let isActive = true;

    ProgressApi.getOverview(today, selectedMonth)
      .then((overview) => {
        if (isActive) setProgress(overview);
      })
      .catch(() => {
        if (isActive) {
          setError(PROGRESS_LOAD_ERROR);
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isGuest, selectedMonth, today]);

  const todayXp = tasks.reduce((sum, task) => {
    if (!task.completed || !task.xpAwarded) return sum;
    const activityDate = getTaskActivityDate(task);
    if (!activityDate || !isSameLocalDay(activityDate, new Date())) return sum;
    return sum + getXpReward(task.energyLevel, task.priority);
  }, 0);

  const createHabit = async (title: string) => {
    setIsSaving(true);
    setError("");
    try {
      const habit = await ProgressApi.createHabit(title, today);
      setProgress((current) => current ? { ...current, habits: [...current.habits, habit] } : current);
      trackProductEvent("habit_created");
      void loadProgress();
      return true;
    } catch {
      setError("Не удалось добавить привычку. Попробуй ещё раз.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const replaceHabit = (habit: Habit) =>
    setProgress((current) => current ? {
      ...current,
      habits: current.habits.map((item) => item.id === habit.id ? habit : item),
    } : current);

  const withPendingHabit = async (habitId: number, action: () => Promise<void>) => {
    setPendingHabitIds((current) => new Set(current).add(habitId));
    try {
      await action();
    } finally {
      setPendingHabitIds((current) => {
        const next = new Set(current);
        next.delete(habitId);
        return next;
      });
    }
  };

  const toggleHabitDate = async (habit: Habit, date: string) => {
    setError("");
    const completed = habit.checkDates.includes(date);
    const optimisticDates = completed
      ? habit.checkDates.filter((item) => item !== date)
      : [...habit.checkDates, date].sort();
    replaceHabit({ ...habit, checkDates: optimisticDates, checkedToday: date === today ? !completed : habit.checkedToday });
    await withPendingHabit(habit.id, async () => {
      try {
        replaceHabit(
          await ProgressApi.setHabitCompleted(habit.id, date, !completed, today)
        );
        void loadProgress();
      } catch {
        replaceHabit(habit);
        setError("Не удалось обновить привычку. Попробуй ещё раз.");
      }
    });
  };

  const archiveHabit = async (habit: Habit) => {
    setError("");
    replaceHabit({ ...habit, archived: true });
    await withPendingHabit(habit.id, async () => {
      try { replaceHabit(await ProgressApi.archiveHabit(habit.id, today)); }
      catch { replaceHabit(habit); setError("Не удалось убрать привычку в архив."); }
    });
  };

  const restoreHabit = async (habit: Habit) => {
    setError("");
    replaceHabit({ ...habit, archived: false });
    await withPendingHabit(habit.id, async () => {
      try { replaceHabit(await ProgressApi.restoreHabit(habit.id, today)); }
      catch { replaceHabit(habit); setError("Не удалось вернуть привычку из архива."); }
    });
  };

  const renameHabit = async (habit: Habit, title: string) => {
    setError("");
    replaceHabit({ ...habit, title });
    let saved = true;
    await withPendingHabit(habit.id, async () => {
      try { replaceHabit(await ProgressApi.updateHabit(habit.id, title, today)); }
      catch { saved = false; replaceHabit(habit); setError("Не удалось изменить привычку."); }
    });
    return saved;
  };

  const deleteHabit = async (habit: Habit) => {
    setError("");
    setProgress((current) => current ? { ...current, habits: current.habits.filter((item) => item.id !== habit.id) } : current);
    await withPendingHabit(habit.id, async () => {
      try { await ProgressApi.deleteHabit(habit.id); void loadProgress(); }
      catch {
        setProgress((current) => current ? { ...current, habits: [...current.habits, habit].sort((a, b) => a.id - b.id) } : current);
        setError("Не удалось удалить привычку.");
      }
    });
  };

  const applyRescue = async () => {
    const eligibleDate = progress?.taskStreak.missedDateEligibleForRescue;
    if (!eligibleDate) return;
    setIsSaving(true);
    setError("");
    try {
      setProgress(await ProgressApi.applyRescue(eligibleDate, today, selectedMonth));
      trackProductEvent("rescue_used");
      setIsRescueConfirmOpen(false);
    } catch {
      setError("Не удалось восстановить стрик. Обнови страницу и попробуй ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 md:px-8 lg:pb-8">
      <div>
        <h1 className="font-display text-3xl font-black text-slate-900 dark:text-slate-100 md:text-4xl">
          Мой прогресс
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
          Уровень, устойчивые серии и привычки в одном месте, без гонки за идеальным днём.
        </p>
      </div>

      <div className="relative">
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" role="tablist">
          {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
          ))}
        </div>
        <FirstUsePopover id="progressNavigation">
          Здесь можно переключаться между уровнем, серией выполненных задач и привычками.
        </FirstUsePopover>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {activeTab === "xp" && (
        <XpPanel
          currentLevel={currentLevel}
          currentXP={currentXP}
          todayXp={todayXp}
          onOpenHelp={() => setIsXpHelpOpen(true)}
        />
      )}
      {activeTab !== "xp" && (isGuest || isLoading || !progress) && (
        <ServerProgressPlaceholder
          isGuest={isGuest}
          isLoading={isLoading}
          onRetry={() => void loadProgress()}
        />
      )}
      {activeTab === "streak" && progress && !isGuest && (
        <StreakPanel
          progress={progress}
          isApplyingRescue={isSaving}
          onUseRescue={async () => setIsRescueConfirmOpen(true)}
          onMonthChange={setSelectedMonth}
        />
      )}
      {activeTab === "habits" && progress && !isGuest && (
        <HabitsPanel
          habits={progress.habits}
          today={today}
          isCreating={isSaving}
          pendingHabitIds={pendingHabitIds}
          onCreate={createHabit}
          onToggleDate={toggleHabitDate}
          onArchive={archiveHabit}
          onRestore={restoreHabit}
          onRename={renameHabit}
          onDelete={deleteHabit}
        />
      )}

      <Modal
        isOpen={isRescueConfirmOpen}
        onClose={() => setIsRescueConfirmOpen(false)}
        title="Восстановить стрик?"
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
          Будет использован один из трёх спасательных кругов на месяц. Отменить действие нельзя.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsRescueConfirmOpen(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Не сейчас
          </button>
          <button
            type="button"
            onClick={() => void applyRescue()}
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSaving ? "Восстанавливаю..." : "Использовать круг"}
          </button>
        </div>
      </Modal>

      {isXpHelpOpen && (
        <div className="fixed inset-0 z-60 flex items-end bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="xp-help-title">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="xp-help-title" className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">Как начисляется XP</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">XP начисляется один раз при первом выполнении задачи.</p>
              </div>
              <button type="button" onClick={() => setIsXpHelpOpen(false)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Закрыть подсказку"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[["Лёгкая задача", "10 XP", "text-emerald-300"], ["Средняя нагрузка", "20 XP", "text-amber-300"], ["Высокая энергия", "30 XP", "text-red-300"]].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
                  <p className={`font-display text-3xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Приоритет добавляет небольшой бонус: P1 x1.5, P2 x1.2, P3 x1.0. Повторное выполнение той же задачи не начисляет XP ещё раз.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessStairsPage;
