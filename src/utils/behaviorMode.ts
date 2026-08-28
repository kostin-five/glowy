import type { AiTone, Task } from "../types";

export const formatPlannedDuration = (minutes: number | null | undefined) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
};

export const isStrictOverdueTask = (
  task: Pick<Task, "completed" | "date">,
  aiTone: AiTone,
  today: string
) => aiTone === "strict" && !task.completed && Boolean(task.date) && task.date < today;
