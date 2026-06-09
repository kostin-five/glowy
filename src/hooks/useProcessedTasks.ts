import { useMemo } from "react";
import {
  useFilter,
  useSearchQuery,
  useSortDirection,
  useSortField,
  useTasks,
} from "../store/useTaskStore";
import type { Task } from "../types";
const energyWeights = { low: 1, med: 2, high: 3 };

const getPriorityWeight = (priority: string) => {
  if (priority.includes("P1")) return 3;
  if (priority.includes("P2")) return 2;
  if (priority.includes("P3")) return 1;

  return 0;
};

const parseTaskDate = (date: string) => {
  const normalizedDate = date.trim();
  const ddMmYyyyMatch = normalizedDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (ddMmYyyyMatch) {
    const [, day, month, year] = ddMmYyyyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }

  const parsedDate = new Date(normalizedDate).getTime();
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
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
          comparison =
            energyWeights[a.energyLevel] - energyWeights[b.energyLevel];
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "date":
          comparison = parseTaskDate(a.date) - parseTaskDate(b.date);
          break;
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
  }, [sortDirection, sortField, filteredTasks]);

  return sortedTasks;
};
