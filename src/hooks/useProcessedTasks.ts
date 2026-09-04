import { useMemo } from "react";
import {
  useFilter,
  useSearchQuery,
  useSortDirection,
  useSortField,
  useTasks,
} from "../store/useTaskStore";
import type { SortDirection, Task } from "../types";
import { parseTaskDateToLocalDay } from "../utils/taskDateGroups";
import { filterTasksAdvanced, type TaskAdvancedFilterState } from "../utils/taskAdvancedFilters";

const energyWeights = { low: 1, med: 2, high: 3 };

const getPriorityWeight = (priority: string) => {
  if (priority.includes("P1")) return 3;
  if (priority.includes("P2")) return 2;
  if (priority.includes("P3")) return 1;

  return 0;
};

const getTaskDateTime = (date: string) => {
  return parseTaskDateToLocalDay(date)?.getTime() ?? null;
};

const compareTaskDates = (
  firstDate: string,
  secondDate: string,
  direction: SortDirection
) => {
  const firstTime = getTaskDateTime(firstDate);
  const secondTime = getTaskDateTime(secondDate);

  if (firstTime === null && secondTime === null) return 0;
  if (firstTime === null) return 1;
  if (secondTime === null) return -1;

  const comparison = firstTime - secondTime;
  return direction === "desc" ? -comparison : comparison;
};

export const useFilteredTasks = () => {
  const tasks = useTasks();
  const filterStatus = useFilter();
  const searchQuery = useSearchQuery();

  const filteredTasks = useMemo((): Task[] => {
    const tasksByStatus = (() => {
      switch (filterStatus) {
      case "Все":
        return tasks;
      case "Активные":
        return tasks.filter((t) => !t.completed);
      default:
        return tasks.filter((t) => t.completed);
      }
    })();
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ru-RU");

    if (!normalizedQuery) return tasksByStatus;

    return tasksByStatus.filter((task) =>
      task.title.toLocaleLowerCase("ru-RU").includes(normalizedQuery)
    );
  }, [tasks, filterStatus, searchQuery]);

  return filteredTasks;
};

export const useProcessedTasks = (advancedFilters?: TaskAdvancedFilterState) => {
  const sortField = useSortField();
  const sortDirection = useSortDirection();
  const filteredTasks = useFilteredTasks();

  const sortedTasks = useMemo(() => {
    const advancedFilteredTasks = advancedFilters
      ? filterTasksAdvanced(filteredTasks, advancedFilters)
      : filteredTasks;
    if (!sortField) {
      return advancedFilteredTasks;
    }
    return [...advancedFilteredTasks].sort((a, b) => {
      let comparison: number;
      switch (sortField) {
        case "energy":
          comparison =
            energyWeights[a.energyLevel] - energyWeights[b.energyLevel];
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          return compareTaskDates(a.date, b.date, sortDirection);
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
        case "priority":
          comparison =
            getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
          break;
        default:
          return 0;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [advancedFilters, sortDirection, sortField, filteredTasks]);

  return sortedTasks;
};
