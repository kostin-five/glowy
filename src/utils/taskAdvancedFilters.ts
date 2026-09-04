import type { EnergyLevel, Priority, Task } from "../types";
import { formatLocalDateOnly } from "./localDate";

export type TaskDateFilter = "all" | "overdue" | "today" | "future" | "undated";

export interface TaskAdvancedFilterState {
  date: TaskDateFilter;
  energy: EnergyLevel | "all";
  priority: Priority | "all";
  category: string;
}

export const EMPTY_TASK_ADVANCED_FILTERS: TaskAdvancedFilterState = {
  date: "all",
  energy: "all",
  priority: "all",
  category: "",
};

export const countTaskAdvancedFilters = (filters: TaskAdvancedFilterState) =>
  Number(filters.date !== "all") +
  Number(filters.energy !== "all") +
  Number(filters.priority !== "all") +
  Number(Boolean(filters.category));

export const filterTasksAdvanced = (
  tasks: Task[],
  filters: TaskAdvancedFilterState,
  today = formatLocalDateOnly()
) =>
  tasks.filter((task) => {
    const matchesDate = (() => {
      if (filters.date === "all") return true;
      if (filters.date === "undated") return !task.date;
      if (!task.date) return false;
      if (filters.date === "today") return task.date === today;
      if (filters.date === "overdue") return !task.completed && task.date < today;
      return task.date > today;
    })();

    return (
      matchesDate &&
      (filters.energy === "all" || task.energyLevel === filters.energy) &&
      (filters.priority === "all" || task.priority === filters.priority) &&
      (!filters.category || task.category === filters.category)
    );
  });
