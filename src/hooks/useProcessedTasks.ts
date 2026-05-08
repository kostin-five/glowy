import { useMemo } from "react";
import {
  useFilter,
  useSortDirection,
  useSortField,
  useTasks,
} from "../store/useTaskStore";
import type { Task } from "../types";

export const useFilteredTasks = () => {
  const tasks = useTasks();
  const filterStatus = useFilter();

  const filteredTasks = useMemo((): Task[] => {
    switch (filterStatus) {
      case "Все":
        return tasks;
      case "Активные":
        return tasks.filter((t) => !t.completed);
      default:
        return tasks.filter((t) => t.completed);
    }
  }, [tasks, filterStatus]);

  return filteredTasks;
};

export const useProcessedTasks = () => {
  const sortField = useSortField();
  const sortDirection = useSortDirection();
  const filteredTasks = useFilteredTasks();

  const sortedTasks = useMemo(() => {
    if (!sortField) {
      return filteredTasks;
    }
    return [...filteredTasks].sort((a, b) => {
      let comparison: number;
      switch (sortField) {
        case "energy":
          comparison = a.energyLevel.localeCompare(b.energyLevel);
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "priority":
          comparison = a.priority.localeCompare(b.priority);
          break;
        default:
          return 0;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [sortDirection, sortField, filteredTasks]);

  return sortedTasks;
};
