import { create } from "zustand";
import type { FilterStatus, SortDirection, SortField, Task } from "../types";
import type { StateCreator } from "zustand";
import { TaskApi } from "../api/TaskApi";
import { SubTaskApi } from "../api/SubTaskApi";
import axios from "axios";

interface TaskStore {
  tasks: Task[];
  filterStatus: FilterStatus;
  sortField: SortField;
  sortDirection: SortDirection;
  userLevel: number;
  isLoading: boolean;
  setFilterStatus: (filterStatus: FilterStatus) => void;
  setSort: (sortField: SortField, sortDirection: SortDirection) => void;
  createTask: (newTask: Task) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  updateTask: (id: number, updatedData: Partial<Task>) => Promise<void>;
  fetchTasks: () => Promise<void>;
  addSubTask: (taskId: number, title: string) => Promise<void>;
  toggleSubTask: (
    subTaskId: number,
    taskId: number,
    completed: boolean
  ) => Promise<void>;
  deleteSubTask: (taskId: number, subTaskId: number) => Promise<void>;
}

const initialTasks: Task[] = [];

const calculateLevel = (tasks: Task[]) => {
  const calculatedCount = tasks.filter((t) => t.completed).length;
  return Math.min(5, calculatedCount + 1);
};

const taskStore: StateCreator<TaskStore> = (set, get) => ({
  tasks: initialTasks,

  filterStatus: "Все",
  sortField: null,
  sortDirection: "asc",

  userLevel: 1,
  isLoading: false,

  setFilterStatus: (filterStatus: FilterStatus) =>
    set(() => ({
      filterStatus: filterStatus,
    })),
  setSort: (sortField: SortField, sortDirection: SortDirection) =>
    set(() => ({
      sortField: sortField,
      sortDirection: sortDirection,
    })),

  createTask: async (newTask: Task) => {
    try {
      const result = await TaskApi.postTask(newTask);
      set((state) => {
        return { tasks: [...state.tasks, result] };
      });
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    }
  },

  deleteTask: async (id: number) => {
    try {
      const deletedTask = await TaskApi.deleteTask(id);
      set((state) => {
        const updatedTasks = state.tasks.filter((task) => task.id !== id);

        return {
          tasks: updatedTasks,
          userLevel: Math.max(state.userLevel, calculateLevel(updatedTasks)),
        };
      });
      return deletedTask;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    }
  },

  toggleTask: async (id: number) => {
    try {
      const taskToToggle = get().tasks.find((t) => t.id === id);
      if (!taskToToggle) return;
      const updatedData = await TaskApi.putTask(id, {
        ...taskToToggle,
        completed: !taskToToggle.completed,
      });
      set((state) => {
        const updatedTasks = state.tasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        );
        return {
          tasks: updatedTasks,
          userLevel: calculateLevel(updatedTasks),
        };
      });
      return updatedData;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    }
  },

  updateTask: async (id: number, updatedData: Partial<Task>) => {
    try {
      const taskToUpdate = get().tasks.find((t) => t.id === id);
      if (!taskToUpdate) return;
      const updateTask = await TaskApi.putTask(id, {
        ...taskToUpdate,
        ...updatedData,
      });
      set((state) => {
        return {
          tasks: state.tasks.map(
            (t: Task): Task => (t.id === id ? { ...t, ...updatedData } : t)
          ),
        };
      });
      return updateTask;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    }
  },

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const response = await TaskApi.getTasks();
      set({ tasks: response });
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addSubTask: async (taskId: number, title: string) => {
    try {
      const newSub = await SubTaskApi.createSubTask(taskId, title);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: [...(task.subtasks || []), newSub],
              }
            : task
        ),
      }));
    } catch (e) {
      console.error("Ошибка при добавлении подзадачи:", e);
    }
  },

  toggleSubTask: async (
    subTaskId: number,
    taskId: number,
    completed: boolean
  ) => {
    try {
      await SubTaskApi.toggleSubTask(subTaskId, completed);

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: task.subtasks?.map((sub) =>
                  sub.id === subTaskId ? { ...sub, completed } : sub
                ),
              }
            : task
        ),
      }));
    } catch (e) {
      console.error("Ошибка при изменении статуса подзадачи:", e);
    }
  },

  deleteSubTask: async (taskId: number, subTaskId: number) => {
    try {
      await SubTaskApi.deleteTask(subTaskId);

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: task.subtasks?.filter((sub) => sub.id !== subTaskId),
              }
            : task
        ),
      }));
    } catch (e) {
      console.error("Ошибка при удалении подзадачи:", e);
    }
  },
});

const useTaskStore = create<TaskStore>()(taskStore);

export const useTasks = () => useTaskStore((state) => state.tasks);
export const useFilter = () => useTaskStore((state) => state.filterStatus);
export const useSortField = () => useTaskStore((state) => state.sortField);
export const useSortDirection = () =>
  useTaskStore((state) => state.sortDirection);
export const useSetFilter = () =>
  useTaskStore((state) => state.setFilterStatus);
export const useUserLevel = () => useTaskStore((state) => state.userLevel);
export const useIsLoading = () => useTaskStore((state) => state.isLoading);
export const useSetSort = () => useTaskStore((state) => state.setSort);
export const useCreateTask = () => useTaskStore((state) => state.createTask);
export const useDeleteTask = () => useTaskStore((state) => state.deleteTask);
export const useToggleTask = () => useTaskStore((state) => state.toggleTask);
export const useUpdateTask = () => useTaskStore((state) => state.updateTask);
export const useFetchTasks = () => useTaskStore((state) => state.fetchTasks);
