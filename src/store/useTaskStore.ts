import { create } from "zustand";
import type { Task } from "../types";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateCreator } from "zustand";

interface TaskStore {
  tasks: Task[];
  filterStatus: FilterStatus;
  sortField: SortField;
  sortDirection: SortDirection;
  setFilterStatus: (filterStatus: FilterStatus) => void;
  setSort: (sortField: SortField, sortDirection: SortDirection) => void;
  createTask: (newTask: Task) => void;
  deleteTask: (id: number) => void;
  toggleTask: (id: number) => void;
  updateTask: (id: number, updatedData: Partial<Task>) => void;
}

export type Priority = "Важно" | "Нормально" | "Не срочно";
export type EnergyLevel = "low" | "med" | "high";
export type FilterStatus = "Все" | "Активные" | "Выполненные";
export type SortField =
  | "date"
  | "energy"
  | "title"
  | "category"
  | "priority"
  | null;
export type SortDirection = "asc" | "desc";

const initialTasks: Task[] = [];

const taskStore: StateCreator<TaskStore> = (set) => ({
  tasks: initialTasks,
  filterStatus: "Все",
  sortField: null,
  sortDirection: "asc",
  setFilterStatus: (filterStatus: FilterStatus) =>
    set(() => ({
      filterStatus: filterStatus,
    })),
  setSort: (sortField: SortField, sortDirection: SortDirection) =>
    set(() => ({
      sortField: sortField,
      sortDirection: sortDirection,
    })),
  createTask: (newTask: Task) =>
    set((state) => ({
      tasks: [...state.tasks, newTask],
    })),
  deleteTask: (id: number) =>
    set((state) => ({
      tasks: state.tasks.filter((t: Task): boolean => t.id !== id),
    })),
  toggleTask: (id: number) =>
    set((state) => ({
      tasks: state.tasks.map(
        (t: Task): Task => (t.id === id ? { ...t, completed: !t.completed } : t)
      ),
    })),
  updateTask: (id: number, updatedData: Partial<Task>) =>
    set((state) => ({
      tasks: state.tasks.map(
        (t: Task): Task => (t.id === id ? { ...t, ...updatedData } : t)
      ),
    })),
});

const useTaskStore = create<TaskStore>()(
  persist(taskStore, {
    name: "tasks-storage",
    storage: createJSONStorage(() => localStorage),
  })
);

export const useTasks = () => useTaskStore((state) => state.tasks);
export const useFilter = () => useTaskStore((state) => state.filterStatus);
export const useSortField = () => useTaskStore((state) => state.sortField);
export const useSortDirection = () =>
  useTaskStore((state) => state.sortDirection);
export const useSetFilter = () =>
  useTaskStore((state) => state.setFilterStatus);
export const useSetSort = () => useTaskStore((state) => state.setSort);
export const useCreateTask = () => useTaskStore((state) => state.createTask);
export const useDeleteTask = () => useTaskStore((state) => state.deleteTask);
export const useToggleTask = () => useTaskStore((state) => state.toggleTask);
export const useUpdateTask = () => useTaskStore((state) => state.updateTask);
