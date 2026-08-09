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
  UserProgress,
} from "../types";
import type { StateCreator } from "zustand";
import { TaskApi, type TaskUpdateResponse } from "../api/TaskApi";
import { SubTaskApi } from "../api/SubTaskApi";
import { UserApi } from "../api/UserApi";
import { useAuthStore } from "./useAuthStore";
import { getLevelByXp, getXpReward } from "../utils/xp";
import { normalizeTaskDate } from "../utils/taskDateGroups";
import axios from "axios";
import { trackProductEventOnce } from "../utils/analytics";

interface TaskStore {
  tasks: Task[];
  filterStatus: FilterStatus;
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  userLevel: number;
  currentXP: number;
  isLoading: boolean;

  setUserProgress: (progress: UserProgress) => void;
  setTasks: (updatedTasks: Task[]) => void;
  removeTaskLocally: (id: number) => { task: Task; index: number } | undefined;
  restoreTaskLocally: (task: Task, index: number) => void;
  confirmTaskDeletion: (id: number) => Promise<void>;
  setFilterStatus: (filterStatus: FilterStatus) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSort: (sortField: SortField, sortDirection: SortDirection) => void;
  createTask: (newTask: TaskDraft) => Promise<Task | undefined>;
  deleteTask: (id: number) => Promise<void>;
  toggleTask: (id: number) => Promise<Task | undefined>;
  updateTask: (
    id: number,
    updatedData: Partial<Task>
  ) => Promise<Task | undefined>;
  fetchTasks: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  addSubTask: (taskId: number, title: string) => Promise<SubTask | undefined>;
  toggleSubTask: (
    subTaskId: number,
    taskId: number,
    completed: boolean
  ) => Promise<SubTask | undefined>;
  updateSubTask: (
    taskId: number,
    subTaskId: number,
    data: Partial<Pick<SubTask, "title" | "completed" | "position">>
  ) => Promise<SubTask | undefined>;
  deleteSubTask: (taskId: number, subTaskId: number) => Promise<void>;
  completeTasks: (ids: number[]) => Promise<void>;
  deleteTasks: (ids: number[]) => Promise<void>;
  updateTasksDate: (ids: number[], date: string) => Promise<void>;
}

const initialTasks: Task[] = [];
const BASE_CATEGORIES = ["Работа", "Учеба", "Спорт", "Быт"];

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
  date: normalizeTaskDate(task.date),
  category: task.category || "",
  xpAwarded: task.xpAwarded ?? false,
  subtasks: sortSubTasks(task.subtasks ?? []),
});

const applyProgress = (progress: UserProgress | null | undefined) =>
  progress
    ? {
        currentXP: progress.xp,
        userLevel: progress.level,
      }
    : {};

const parseTaskUpdateResponse = (response: Task | TaskUpdateResponse) =>
  "task" in response
    ? {
        task: response.task,
        userProgress: response.userProgress,
      }
    : {
        task: response,
        userProgress: null,
      };

const applyOptimisticXpReward = (currentXP: number, task: Task) => {
  const nextXP = currentXP + getXpReward(task.energyLevel, task.priority);

  return {
    currentXP: nextXP,
    userLevel: getLevelByXp(nextXP),
  };
};

const isGuestSession = () => useAuthStore.getState().isGuest;

const buildLocalTask = (draft: TaskDraft): Task => {
  const taskId = draft.id ?? Date.now();

  return normalizeTask({
    id: taskId,
    title: draft.title,
    date: normalizeTaskDate(draft.date),
    priority: draft.priority,
    category: draft.category || "",
    completed: draft.completed ?? false,
    xpAwarded: false,
    energyLevel: draft.energyLevel,
    subtasks: (draft.subtasks ?? []).map((subtask, index) => ({
      id: taskId + index + 1,
      taskId,
      title: subtask.title,
      completed: subtask.completed ?? false,
      position: subtask.position ?? index,
    })),
  });
};

const taskStore: StateCreator<TaskStore> = (set, get) => ({
  tasks: initialTasks,

  filterStatus: "Активные",
  searchQuery: "",
  sortField: null,
  sortDirection: "asc",

  userLevel: 1,
  currentXP: 0,
  isLoading: false,

  setUserProgress: (progress: UserProgress) =>
    set(() => ({
      currentXP: progress.xp,
      userLevel: progress.level,
    })),

  setTasks: (updatedTasks: Task[]) =>
    set(() => ({
      tasks: updatedTasks.map(normalizeTask),
    })),

  removeTaskLocally: (id: number) => {
    const taskIndex = get().tasks.findIndex((task) => task.id === id);
    if (taskIndex === -1) return undefined;

    const taskToRemove = get().tasks[taskIndex];

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));

    return { task: taskToRemove, index: taskIndex };
  },

  restoreTaskLocally: (task: Task, index: number) =>
    set((state) => {
      if (state.tasks.some((currentTask) => currentTask.id === task.id)) {
        return {};
      }

      const nextTasks = [...state.tasks];
      nextTasks.splice(Math.min(index, nextTasks.length), 0, normalizeTask(task));

      return { tasks: nextTasks };
    }),

  confirmTaskDeletion: async (id: number) => {
    if (isGuestSession()) return;

    try {
      await TaskApi.deleteTask(id);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    }
  },

  setFilterStatus: (filterStatus: FilterStatus) =>
    set(() => ({
      filterStatus: filterStatus,
    })),
  setSearchQuery: (searchQuery: string) =>
    set(() => ({
      searchQuery,
    })),
  setSort: (sortField: SortField, sortDirection: SortDirection) =>
    set(() => ({
      sortField: sortField,
      sortDirection: sortDirection,
    })),

  createTask: async (newTask: TaskDraft) => {
    if (isGuestSession()) {
      const result = buildLocalTask(newTask);
      set((state) => ({
        tasks: [...state.tasks, result],
      }));
      return result;
    }

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
      trackProductEventOnce("first_task_created");
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
    if (isGuestSession()) {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
      return;
    }

    try {
      const deletedTask = await TaskApi.deleteTask(id);
      set((state) => {
        const updatedTasks = state.tasks.filter((task) => task.id !== id);

        return {
          tasks: updatedTasks,
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
    if (isGuestSession()) {
      const taskToToggle = get().tasks.find((t) => t.id === id);
      if (!taskToToggle) return;

      const nextCompleted = !taskToToggle.completed;
      const shouldAwardXp = nextCompleted && !taskToToggle.xpAwarded;
      const updatedTask = normalizeTask({
        ...taskToToggle,
        completed: nextCompleted,
        xpAwarded: taskToToggle.xpAwarded || shouldAwardXp,
      });

      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
        ...(shouldAwardXp
          ? applyOptimisticXpReward(state.currentXP, taskToToggle)
          : {}),
      }));

      return updatedTask;
    }

    try {
      const taskToToggle = get().tasks.find((t) => t.id === id);
      if (!taskToToggle) return;
      const nextCompleted = !taskToToggle.completed;
      const result = await TaskApi.putTask(id, {
        ...taskToToggle,
        completed: nextCompleted,
      });
      const { task: responseTask, userProgress } =
        parseTaskUpdateResponse(result);
      const shouldAwardOptimisticXp =
        nextCompleted && !taskToToggle.xpAwarded && !userProgress;
      const nextXpAwarded = Boolean(
        responseTask.xpAwarded ||
          taskToToggle.xpAwarded ||
          shouldAwardOptimisticXp
      );
      const updatedTask = normalizeTask({
        ...responseTask,
        xpAwarded: nextXpAwarded,
      });
      set((state) => {
        const updatedTasks = state.tasks.map((t) =>
          t.id === id ? updatedTask : t
        );
        return {
          tasks: updatedTasks,
          ...(userProgress
            ? applyProgress(userProgress)
            : shouldAwardOptimisticXp
            ? applyOptimisticXpReward(state.currentXP, taskToToggle)
            : {}),
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
    if (isGuestSession()) {
      const taskToUpdate = get().tasks.find((t) => t.id === id);
      if (!taskToUpdate) return;

      const updatedTask = normalizeTask({
        ...taskToUpdate,
        ...updatedData,
        subtasks: applySubTaskPositions(
          updatedData.subtasks ?? taskToUpdate.subtasks ?? []
        ),
      });

      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }));

      return updatedTask;
    }

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
      const result = await TaskApi.putTask(id, payload);
      const { task: responseTask, userProgress } =
        parseTaskUpdateResponse(result);
      const updatedTask = normalizeTask({
        ...responseTask,
        subtasks: applySubTaskPositions(
          updatedData.subtasks ?? responseTask.subtasks ?? []
        ),
      });
      set((state) => {
        return {
          tasks: state.tasks.map(
            (t: Task): Task => (t.id === id ? updatedTask : t)
          ),
          ...applyProgress(userProgress),
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
    if (isGuestSession()) {
      set({ isLoading: false });
      return;
    }

    const hasCachedTasks = get().tasks.length > 0;
    set({ isLoading: !hasCachedTasks });
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

  fetchProgress: async () => {
    if (isGuestSession()) return;

    try {
      const progress = await UserApi.getProgress();
      set({
        currentXP: progress.xp,
        userLevel: progress.level,
      });
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("Ошибка сервера:", e.response?.data?.error || e.message);
      } else if (e instanceof Error) {
        console.error("Внутренняя ошибка:", e.message);
      }
    }
  },

  addSubTask: async (taskId: number, title: string) => {
    if (isGuestSession()) {
      const newSub: SubTask = {
        id: Date.now(),
        taskId,
        title,
        completed: false,
        position: get().tasks.find((task) => task.id === taskId)?.subtasks
          ?.length ?? 0,
      };

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
    }

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
    if (isGuestSession()) {
      let updatedSub: SubTask | undefined;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: sortSubTasks(
                  task.subtasks?.map((sub) => {
                    if (sub.id !== subTaskId) return sub;
                    updatedSub = { ...sub, completed };
                    return updatedSub;
                  })
                ),
              }
            : task
        ),
      }));

      return updatedSub;
    }

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

  updateSubTask: async (taskId, subTaskId, data) => {
    const trimmedTitle =
      typeof data.title === "string" ? data.title.trim() : undefined;
    const payload = {
      ...data,
      ...(trimmedTitle !== undefined ? { title: trimmedTitle } : {}),
    };

    if (trimmedTitle !== undefined && !trimmedTitle) return;

    if (isGuestSession()) {
      let updatedSub: SubTask | undefined;

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: sortSubTasks(
                  task.subtasks?.map((sub) => {
                    if (sub.id !== subTaskId) return sub;
                    updatedSub = { ...sub, ...payload };
                    return updatedSub;
                  })
                ),
              }
            : task
        ),
      }));

      return updatedSub;
    }

    try {
      const updatedSub = await SubTaskApi.updateSubTask(subTaskId, payload);

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
      console.error("Ошибка при обновлении подзадачи:", e);
    }
  },

  deleteSubTask: async (taskId: number, subTaskId: number) => {
    if (isGuestSession()) {
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
      return;
    }

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

  completeTasks: async (ids: number[]) => {
    await Promise.all(ids.map((id) => get().toggleTask(id)));
  },

  deleteTasks: async (ids: number[]) => {
    await Promise.all(ids.map((id) => get().deleteTask(id)));
  },

  updateTasksDate: async (ids: number[], date: string) => {
    await Promise.all(ids.map((id) => get().updateTask(id, { date })));
  },
});

export const useTaskStore = create<TaskStore>()(
  persist(taskStore, {
    name: "glowy-tasks",
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...(persistedState as Partial<TaskStore>),
      filterStatus: "Активные",
    }),
    partialize: (state) => ({
      tasks: state.tasks,
      sortField: state.sortField,
      sortDirection: state.sortDirection,
      userLevel: state.userLevel,
      currentXP: state.currentXP,
    }),
  })
);

export const useTasks = () => useTaskStore((state) => state.tasks);
export const useFilter = () => useTaskStore((state) => state.filterStatus);
export const useSearchQuery = () => useTaskStore((state) => state.searchQuery);
export const useSortField = () => useTaskStore((state) => state.sortField);
export const useSortDirection = () =>
  useTaskStore((state) => state.sortDirection);
export const useSetFilter = () =>
  useTaskStore((state) => state.setFilterStatus);
export const useSetSearchQuery = () =>
  useTaskStore((state) => state.setSearchQuery);
export const useUserLevel = () => useTaskStore((state) => state.userLevel);
export const useCurrentXP = () => useTaskStore((state) => state.currentXP);
export const useIsLoading = () => useTaskStore((state) => state.isLoading);
export const useSetUserProgress = () =>
  useTaskStore((state) => state.setUserProgress);
export const useSetTasks = () => useTaskStore((state) => state.setTasks);
export const useRemoveTaskLocally = () =>
  useTaskStore((state) => state.removeTaskLocally);
export const useRestoreTaskLocally = () =>
  useTaskStore((state) => state.restoreTaskLocally);
export const useConfirmTaskDeletion = () =>
  useTaskStore((state) => state.confirmTaskDeletion);
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
export const useFetchProgress = () =>
  useTaskStore((state) => state.fetchProgress);

export const useAddSubTask = () => useTaskStore((state) => state.addSubTask);
export const useToggleSubTask = () =>
  useTaskStore((state) => state.toggleSubTask);
export const useUpdateSubTask = () =>
  useTaskStore((state) => state.updateSubTask);
export const useDeleteSubTask = () =>
  useTaskStore((state) => state.deleteSubTask);
