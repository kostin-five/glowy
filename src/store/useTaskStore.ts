import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";
import type {
  FilterStatus,
  SortDirection,
  SortField,
  SubTask,
  Task,
  TaskDraft,
} from "../types";
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

  setTasks: (updatedTasks: Task[]) => void;
  setFilterStatus: (filterStatus: FilterStatus) => void;
  setSort: (sortField: SortField, sortDirection: SortDirection) => void;
  createTask: (newTask: TaskDraft) => Promise<Task | undefined>;
  deleteTask: (id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<Task | undefined>;
  updateTask: (
    id: number,
    updatedData: Partial<Task>
  ) => Promise<Task | undefined>;
  fetchTasks: () => Promise<void>;
  addSubTask: (taskId: number, title: string) => Promise<SubTask | undefined>;
  toggleSubTask: (
    subTaskId: number,
    taskId: number,
    completed: boolean
  ) => Promise<SubTask | undefined>;
  deleteSubTask: (taskId: number, subTaskId: number) => Promise<void>;
}

const initialTasks: Task[] = [];
const BASE_CATEGORIES = ["Работа", "Учеба", "Спорт", "Быт"];

const calculateLevel = (tasks: Task[]) => {
  const calculatedCount = tasks.filter((t) => t.completed).length;
  return Math.min(5, calculatedCount + 1);
};

const sortSubTasks = (subtasks: SubTask[] = []) =>
  subtasks
    .map((sub, index) => ({
      ...sub,
      position: sub.position ?? index,
    }))
    .sort((a, b) => {
      const positionDiff = (a.position ?? 0) - (b.position ?? 0);
      return positionDiff || a.id - b.id;
    });

const applySubTaskPositions = (subtasks: SubTask[] = []) =>
  subtasks.map((sub, index) => ({
    ...sub,
    position: index,
  }));

const normalizeTask = (task: Task): Task => ({
  ...task,
  category: task.category || "",
  subtasks: sortSubTasks(task.subtasks ?? []),
});

const taskStore: StateCreator<TaskStore> = (set, get) => ({
  tasks: initialTasks,

  filterStatus: "Все",
  sortField: null,
  sortDirection: "asc",

  userLevel: 1,
  isLoading: false,

  setTasks: (updatedTasks: Task[]) =>
    set(() => ({
      tasks: updatedTasks.map(normalizeTask),
    })),

  setFilterStatus: (filterStatus: FilterStatus) =>
    set(() => ({
      filterStatus: filterStatus,
    })),
  setSort: (sortField: SortField, sortDirection: SortDirection) =>
    set(() => ({
      sortField: sortField,
      sortDirection: sortDirection,
    })),

  createTask: async (newTask: TaskDraft) => {
    try {
      const result = normalizeTask(await TaskApi.postTask(newTask));
      set((state) => {
        const clientId = "id" in newTask ? newTask.id : undefined;
        const hasClientTask =
          typeof clientId === "number" &&
          state.tasks.some((task) => task.id === clientId);

        return {
          tasks: hasClientTask
            ? state.tasks.map((task) => (task.id === clientId ? result : task))
            : [...state.tasks, result],
        };
      });
      return result;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const message = e.response?.data?.error || e.message;
        console.error("Ошибка сервера:", message);
        throw new Error(message, { cause: e });
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
        throw e;
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
      const updatedTask = normalizeTask(
        await TaskApi.putTask(id, {
          ...taskToToggle,
          completed: !taskToToggle.completed,
        })
      );
      set((state) => {
        const updatedTasks = state.tasks.map((t) =>
          t.id === id ? updatedTask : t
        );
        return {
          tasks: updatedTasks,
          userLevel: calculateLevel(updatedTasks),
        };
      });
      return updatedTask;
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
      const payload = {
        ...taskToUpdate,
        ...updatedData,
        subtasks: applySubTaskPositions(
          updatedData.subtasks ?? taskToUpdate.subtasks ?? []
        ),
      };
      const serverTask = await TaskApi.putTask(id, payload);
      const updatedTask = normalizeTask({
        ...serverTask,
        subtasks: applySubTaskPositions(
          updatedData.subtasks ?? serverTask.subtasks ?? []
        ),
      });
      set((state) => {
        return {
          tasks: state.tasks.map(
            (t: Task): Task => (t.id === id ? updatedTask : t)
          ),
        };
      });
      return updatedTask;
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
      set({ tasks: response.map(normalizeTask) });
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
      const taskToUpdate = get().tasks.find((task) => task.id === taskId);
      if (!taskToUpdate) return;

      const newSub = await SubTaskApi.createSubTask(taskId, title);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: sortSubTasks([...(task.subtasks || []), newSub]),
              }
            : task
        ),
      }));
      return newSub;
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
      const updatedSub = await SubTaskApi.toggleSubTask(subTaskId, completed);

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId || task.id === updatedSub.taskId
            ? {
                ...task,
                subtasks: sortSubTasks(
                  task.subtasks?.map((sub) =>
                    sub.id === subTaskId ? updatedSub : sub
                  )
                ),
              }
            : task
        ),
      }));
      return updatedSub;
    } catch (e) {
      console.error("Ошибка при изменении статуса подзадачи:", e);
    }
  },

  deleteSubTask: async (taskId: number, subTaskId: number) => {
    try {
      await SubTaskApi.deleteSubTask(subTaskId);

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

export const useTaskStore = create<TaskStore>()(
  persist(taskStore, {
    name: "glowy-tasks",
    partialize: (state) => ({
      tasks: state.tasks,
      filterStatus: state.filterStatus,
      sortField: state.sortField,
      sortDirection: state.sortDirection,
      userLevel: state.userLevel,
    }),
  })
);

export const useTasks = () => useTaskStore((state) => state.tasks);
export const useFilter = () => useTaskStore((state) => state.filterStatus);
export const useSortField = () => useTaskStore((state) => state.sortField);
export const useSortDirection = () =>
  useTaskStore((state) => state.sortDirection);
export const useSetFilter = () =>
  useTaskStore((state) => state.setFilterStatus);
export const useUserLevel = () => useTaskStore((state) => state.userLevel);
export const useIsLoading = () => useTaskStore((state) => state.isLoading);
export const useSetTasks = () => useTaskStore((state) => state.setTasks);
export const useAllCategories = () => {
  const tasks = useTaskStore((state) => state.tasks);

  return useMemo(() => {
    const customCategories = tasks
      .map((task) => (task.category || "").trim())
      .filter((cat) => cat.length > 0);
    return Array.from(new Set([...BASE_CATEGORIES, ...customCategories]));
  }, [tasks]);
};
export const useSetSort = () => useTaskStore((state) => state.setSort);
export const useCreateTask = () => useTaskStore((state) => state.createTask);
export const useDeleteTask = () => useTaskStore((state) => state.deleteTask);
export const useToggleTask = () => useTaskStore((state) => state.toggleTask);
export const useUpdateTask = () => useTaskStore((state) => state.updateTask);
export const useFetchTasks = () => useTaskStore((state) => state.fetchTasks);

export const useAddSubTask = () => useTaskStore((state) => state.addSubTask);
export const useToggleSubTask = () =>
  useTaskStore((state) => state.toggleSubTask);
export const useDeleteSubTask = () =>
  useTaskStore((state) => state.deleteSubTask);
