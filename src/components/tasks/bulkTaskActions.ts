import type { Task } from "../../types";
import { formatLocalDateOnly } from "../../utils/localDate";

export const getTomorrowDate = (now = new Date()) => {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatLocalDateOnly(tomorrow);
};

export const moveSelectedTasks = async ({
  tasks,
  selectedIds,
  targetDate,
  updateTask,
}: {
  tasks: Task[];
  selectedIds: Set<number>;
  targetDate: string;
  updateTask: (id: number, patch: Partial<Task>) => Promise<Task | undefined>;
}) => {
  const candidates = tasks.filter((task) => selectedIds.has(task.id) && !task.completed);
  const succeededIds: number[] = [];
  const failedIds: number[] = [];

  for (const task of candidates) {
    try {
      const updated = await updateTask(task.id, { date: targetDate });
      if (updated) succeededIds.push(task.id);
      else failedIds.push(task.id);
    } catch {
      failedIds.push(task.id);
    }
  }

  return { succeededIds, failedIds };
};

