import type { Task } from "../types";
import { formatPlannedDuration } from "./behaviorMode";

export const getTaskPriorityLabel = (priority: string) => {
  if (priority.includes("P1")) return "Высокий";
  if (priority.includes("P2")) return "Средний";
  if (priority.includes("P3")) return "Низкий";
  return priority;
};

export const getTaskPriorityRibbonStyles = (priority: string) => {
  if (priority.includes("P1")) {
    return "border-red-500/80 bg-white/80 text-red-600 dark:bg-slate-950/70 dark:text-red-300";
  }
  if (priority.includes("P2")) {
    return "border-amber-400/80 bg-white/80 text-amber-700 dark:bg-slate-950/70 dark:text-amber-300";
  }
  return "border-emerald-500/80 bg-white/80 text-emerald-700 dark:bg-slate-950/70 dark:text-emerald-300";
};

export const getTaskEnergyAccentStyles = (energyLevel: Task["energyLevel"]) => {
  if (energyLevel === "high") return "bg-red-500";
  if (energyLevel === "med") return "bg-yellow-400";
  return "bg-green-500";
};

export const getTaskSubtaskProgress = (task: Task) => {
  const total = task.subtasks?.length ?? 0;
  if (!total) return null;
  return {
    completed: task.subtasks.filter((subtask) => subtask.completed).length,
    total,
  };
};

export const getTaskPlannedDuration = (task: Task) =>
  formatPlannedDuration(task.estimatedMinutes);

