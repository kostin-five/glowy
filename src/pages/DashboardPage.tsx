import { useRef, useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";
import { useAuthStore } from "../store/useAuthStore";
import { EnergySlider } from "../components/layout/EnergySlider";
import MindHubChat from "../components/mind/MindHubChat";
import useMediaQuery from "../hooks/useMediaQuery";
import { formatTaskDateForUI } from "../utils/taskDateGroups";
import type { Task } from "../types";

const AI_TASK_IDS_KEY = "glowy-ai-created-task-ids";
const AI_TASK_IDS_EVENT = "glowy-ai-created-task-ids-updated";

const getTodayLocalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const readAiTaskIds = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_TASK_IDS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is number => typeof id === "number");
  } catch {
    return [];
  }
};

const energyAccent: Record<Task["energyLevel"], string> = {
  low: "bg-emerald-400",
  med: "bg-amber-400",
  high: "bg-rose-400",
};

const getFocusHint = (currentEnergy: number) => {
  if (currentEnergy <= 30) {
    return "Заряд низкий, поэтому лучше взять короткий шаг и не давить на себя.";
  }

  if (currentEnergy <= 70) {
    return "Средний заряд: начни спокойно, а сложное оставь после первого разгона.";
  }

  return "Заряда хватает: можно взять задачу посложнее и закрыть заметный кусок дня.";
};

const getEnergyOrder = (currentEnergy: number): Task["energyLevel"][] => {
  if (currentEnergy <= 25) return ["low", "med", "high"];
  if (currentEnergy <= 60) return ["med", "low", "high"];
  if (currentEnergy <= 80) return ["med", "high", "low"];
  return ["high", "med", "low"];
};

const getPriorityOrder = (currentEnergy: number) => {
  if (currentEnergy <= 25) return ["P3", "P2", "P1"];
  if (currentEnergy <= 60) return ["P2", "P3", "P1"];
  if (currentEnergy <= 80) return ["P2", "P1", "P3"];
  return ["P1", "P2", "P3"];
};

const getPriorityRank = (priority: string, order: string[]) => {
  const normalizedPriority = priority || "P2";
  const index = order.findIndex((value) => normalizedPriority.includes(value));
  return index === -1 ? order.indexOf("P2") : index;
};

const getSubtaskProgress = (task: Task) => {
  const total = task.subtasks?.length ?? 0;
  if (!total) return null;

  const completed = task.subtasks.filter((subtask) => subtask.completed).length;
  return `${completed}/${total}`;
};

const TaskMiniRow = ({ task }: { task: Task }) => {
  const subtaskProgress = getSubtaskProgress(task);

  return (
    <Link to="/tasks" className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 transition-colors hover:border-indigo-300/70 hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/35 dark:hover:border-indigo-500/40 dark:hover:bg-slate-900/70">
    <span
      className={`h-10 w-1 shrink-0 rounded-full ${energyAccent[task.energyLevel]}`}
    />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
        {task.title}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{formatTaskDateForUI(task.date)}</span>
        {task.category && (
          <span className="rounded-lg border border-slate-300/70 px-2 py-0.5 text-slate-600 dark:border-slate-600/80 dark:text-slate-300">
            {task.category}
          </span>
        )}
        {subtaskProgress && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 font-semibold text-indigo-500 dark:text-indigo-300">
            <ListChecks size={12} />
            {subtaskProgress}
          </span>
        )}
      </div>
    </div>
  </Link>
  );
};

const DashboardPage = () => {
  const currentLevel = useTaskStore((state) => state.userLevel);
  const userName = useAuthStore((state) => state.name);
  const currentEnergy = useAuthStore((state) => state.currentEnergy);
  const tasks = useTaskStore((state) => state.tasks);
  const [aiTaskIds, setAiTaskIds] = useState<number[]>(readAiTaskIds);

  useEffect(() => {
    const updateAiIds = () => {
      setAiTaskIds(readAiTaskIds());
    };

    window.addEventListener(AI_TASK_IDS_EVENT, updateAiIds);
    return () => window.removeEventListener(AI_TASK_IDS_EVENT, updateAiIds);
  }, []);

  const { todayTasks, aiTasks, focusTasks } = useMemo(() => {
    const active = tasks.filter((t) => !t.completed);
    const todayStr = getTodayLocalDate();
    const today = active.filter((t) => t.date === todayStr);
    const focusCandidates = today.length ? today : active;

    const preferredEnergy = getEnergyOrder(currentEnergy);
    const preferredPriority = getPriorityOrder(currentEnergy);
    const recommendedFocusTasks = [...focusCandidates]
      .sort(
        (a, b) => {
          const energyDiff =
            preferredEnergy.indexOf(a.energyLevel) -
            preferredEnergy.indexOf(b.energyLevel);
          if (energyDiff !== 0) return energyDiff;

          const priorityDiff =
            getPriorityRank(a.priority, preferredPriority) -
            getPriorityRank(b.priority, preferredPriority);
          if (priorityDiff !== 0) return priorityDiff;

          return a.title.localeCompare(b.title, "ru");
        }
      )
      .slice(0, 2);

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const recentAiTasks = aiTaskIds
      .map((id) => taskById.get(id))
      .filter((task): task is Task => task !== undefined && !task.completed);

    return {
      todayTasks: today,
      aiTasks: recentAiTasks,
      focusTasks: recommendedFocusTasks,
    };
  }, [tasks, currentEnergy, aiTaskIds]);
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

  return (
    <div className="flex flex-col gap-8">
      <div className="mb-8">
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
          <section className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none xl:flex-1">
            <div>
              <h2 className="font-display text-2xl font-black text-slate-900 dark:text-slate-100">
                Фокус дня
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Лучше начать с
              </p>

              {focusTasks.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {focusTasks.map((task) => (
                      <TaskMiniRow key={task.id} task={task} />
                    ))}
                  </div>
                  <div className="mt-5 hidden rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-sm leading-6 text-indigo-100/90 xl:block">
                    {getFocusHint(currentEnergy)}
                  </div>
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

          <EnergySlider />
        </div>

        {isDesktopLayout && (
          <div className="xl:col-span-5">
            <MindHubChat inputRef={mindHubInputRef} />
          </div>
        )}

        <section className="flex min-h-0 flex-col gap-6 xl:col-span-4 xl:h-[calc(100vh-12rem)]">
          <div className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
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
              <div className="custom-scrollbar max-h-80 space-y-3 overflow-y-auto pr-2">
                {todayTasks.map((task) => (
                  <TaskMiniRow key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                На сегодня нет активных задач.
              </p>
            )}
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
            <h2 className="mb-5 font-display text-2xl font-black text-slate-900 dark:text-slate-100">
              Недавно добавлено
            </h2>
            {aiTasks.length > 0 ? (
              <div className="custom-scrollbar max-h-80 space-y-3 overflow-y-auto pr-2">
                {aiTasks.map((task) => (
                  <TaskMiniRow key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Сегодня нет задач, подтверждённых в Разгрузке мыслей.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
