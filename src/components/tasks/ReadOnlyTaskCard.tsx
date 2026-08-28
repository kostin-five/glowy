import { Clock3, ListChecks } from "lucide-react";
import type { Task } from "../../types";
import { formatTaskDateForUI } from "../../utils/taskDateGroups";
import {
  getTaskEnergyAccentStyles,
  getTaskPlannedDuration,
  getTaskPriorityLabel,
  getTaskPriorityRibbonStyles,
  getTaskSubtaskProgress,
} from "../../utils/taskCardPresentation";

const ReadOnlyTaskCard = ({ task }: { task: Task }) => {
  const duration = getTaskPlannedDuration(task);
  const subtaskProgress = getTaskSubtaskProgress(task);

  return (
    <article className="relative w-full overflow-visible pt-3" aria-label={`Задача: ${task.title}`}>
      <div className={`absolute left-4 top-0 z-10 inline-flex h-7 max-w-[calc(100%-2rem)] items-center rounded-t-xl rounded-b-md border px-3 text-xs font-black tracking-wide shadow-sm backdrop-blur-md ${getTaskPriorityRibbonStyles(task.priority)}`}>
        <span className="truncate">{getTaskPriorityLabel(task.priority)}</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/55 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/25 dark:shadow-none">
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${getTaskEnergyAccentStyles(task.energyLevel)}`} />
        <div className="min-w-0 pl-2">
          <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>{formatTaskDateForUI(task.date)}</span>
            {duration && (
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300/50 bg-cyan-400/10 px-2 py-0.5 font-semibold text-cyan-700 dark:border-cyan-400/25 dark:text-cyan-200">
                <Clock3 size={12} aria-hidden="true" />
                {duration}
              </span>
            )}
            {task.category && (
              <span className="rounded-md border border-slate-300/70 px-2 py-0.5 dark:border-slate-700">{task.category}</span>
            )}
            {subtaskProgress && (
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 font-semibold text-indigo-600 dark:text-indigo-300" aria-label={`Подзадачи: ${subtaskProgress.completed} из ${subtaskProgress.total}`}>
                <ListChecks size={12} aria-hidden="true" />
                {subtaskProgress.completed}/{subtaskProgress.total}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ReadOnlyTaskCard;

