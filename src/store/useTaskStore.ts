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
  TaskCompletionOutcome,
} from "../types";
import type { StateCreator } from "zustand";
import { TaskApi } from "../api/TaskApi";
import { UserApi } from "../api/UserApi";
import { useAuthStore } from "./useAuthStore";
import { getLevelByXp, getXpReward } from "../utils/xp";
import { normalizeTaskDate } from "../utils/taskDateGroups";
import axios from "axios";
import { trackProductEventOnce } from "../utils/analytics";
import { formatLocalDateOnly } from "../utils/localDate";
import {
  createOfflineEntityId,
  enqueueTaskOperation,
} from "../offline/taskOfflineQueue";
import {
  getActiveOfflineOwnerKey,
  markTaskOfflineMutation,
  persistActiveTaskSnapshot,
  syncOfflineTasks,
} from "../offline/taskOfflineSync";

interface TaskStore {
  tasks: Task[];
  filterStatus: FilterStatus;
  searchQuery: string;
  sortField: SortField;
  sortDirection: SortDirection;
  userLevel: number;
  currentXP: number;
  isLoading: boolean;
  completionNotice: string | null;

  setUserProgress: (progress: UserProgress) => void;
  setCompletionNotice: (notice: string | null) => void;
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
  completedOn: task.completedOn ?? null,
  xpAwarded: task.xpAwarded ?? false,
  estimatedMinutes: task.estimatedMinutes ?? null,
  actualMinutes: task.actualMinutes ?? null,
  subtasks: sortSubTasks(task.subtasks ?? []),
});

export const getOptimisticCompletionOutcome = ({
  currentXP,
  task,
  tasks,
  completedOn,
  aiTone,
}: {
  currentXP: number;
  task: Task;
  tasks: Task[];
  completedOn: string;
  aiTone: "calm" | "moderate" | "strict";
}) => {
  const reward = getXpReward(task.energyLevel, task.priority);
  const targetIsOverdue = Boolean(task.date && task.date < completedOn);
  const hasOverdueBlocker = !targetIsOverdue && tasks.some(
    (candidate) =>
      candidate.id !== task.id &&
      !candidate.completed &&
      Boolean(candidate.date) &&
      candidate.date < completedOn
  );
  const delta = !hasOverdueBlocker || aiTone === "calm"
    ? reward
    : aiTone === "strict"
      ? -Math.min(reward, currentXP)
      : 0;
  const notice = !hasOverdueBlocker || aiTone === "calm"
    ? `Начислено +${reward} XP.`
    : aiTone === "strict"
      ? `Списано ${Math.abs(delta)} XP: сначала закрой просроченную задачу.`
      : "XP не начислены: сначала закрой просроченную задачу.";

  return { delta, notice };
};

const applyOptimisticXpOutcome = (
  currentXP: number,
  outcome: ReturnType<typeof getOptimisticCompletionOutcome>
) => {
  const nextXP = Math.max(0, currentXP + outcome.delta);

  return {
    currentXP: nextXP,
    userLevel: getLevelByXp(nextXP),
    completionNotice: outcome.notice,
  };
};

export const getCompletionOutcomeNotice = (
  outcome: TaskCompletionOutcome | null | undefined
) => {
  if (!outcome) return null;
  if (outcome.effect === "withheld") {
    return "XP не начислены: сначала закрой просроченную задачу.";
  }
  if (outcome.effect === "deducted") {
    return `Списано ${outcome.amount} XP: сначала закрой просроченную задачу.`;
  }
  if (outcome.effect === "awarded") return `Начислено +${outcome.amount} XP.`;
  return null;
};

const isGuestSession = () => useAuthStore.getState().isGuest;

const persistAndQueue = async (
  tasks: Task[],
  operation: Parameters<typeof enqueueTaskOperation>[1]
) => {
  const ownerKey = getActiveOfflineOwnerKey();
  if (!ownerKey) throw new Error("Offline-хранилище аккаунта ещё не готово");
  markTaskOfflineMutation();
  await enqueueTaskOperation(ownerKey, operation);
  await persistActiveTaskSnapshot(tasks);
  markTaskOfflineMutation();
  void syncOfflineTasks();
};

const buildLocalTask = (draft: TaskDraft): Task => {
  const taskId = draft.id ?? Date.now();

  return normalizeTask({
    id: taskId,
    title: draft.title,
    date: normalizeTaskDate(draft.date),
    priority: draft.priority,
    category: draft.category || "",
    completed: draft.completed ?? false,
    completedOn: draft.completed ? formatLocalDateOnly() : null,
    xpAwarded: false,
    energyLevel: draft.energyLevel,
    estimatedMinutes: draft.estimatedMinutes ?? null,
    actualMinutes: null,
    subtasks: (draft.subtasks ?? []).map((subtask, index) => ({
      id: taskId < 0 ? createOfflineEntityId() : taskId + index + 1,
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
  completionNotice: null,

  setUserProgress: (progress: UserProgress) =>
    set(() => ({
      currentXP: progress.xp,
      userLevel: progress.level,
    })),
  setCompletionNotice: (completionNotice) => set({ completionNotice }),

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
    await persistAndQueue(get().tasks, {
      kind: "task.delete",
      entityId: id,
      payload: {},
    });
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

    const result = buildLocalTask({ ...newTask, id: createOfflineEntityId() });
    set((state) => ({ tasks: [...state.tasks, result] }));
    await persistAndQueue(get().tasks, {
      kind: "task.create",
      entityId: result.id,
      payload: newTask,
    });
    trackProductEventOnce("first_task_created");
    return result;
  },

  deleteTask: async (id: number) => {
    if (isGuestSession()) {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
      return;
    }

    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
    await persistAndQueue(get().tasks, {
      kind: "task.delete",
      entityId: id,
      payload: {},
    });
  },

  toggleTask: async (id: number) => {
    if (isGuestSession()) {
      const taskToToggle = get().tasks.find((t) => t.id === id);
      if (!taskToToggle) return;

      const nextCompleted = !taskToToggle.completed;
      const shouldAwardXp = nextCompleted && !taskToToggle.xpAwarded;
      const completedOn = nextCompleted ? formatLocalDateOnly() : null;
      const outcome = shouldAwardXp && completedOn
        ? getOptimisticCompletionOutcome({
            currentXP: get().currentXP,
            task: taskToToggle,
            tasks: get().tasks,
            completedOn,
            aiTone: "calm",
          })
        : null;
      const updatedTask = normalizeTask({
        ...taskToToggle,
        completed: nextCompleted,
        completedOn,
        xpAwarded: taskToToggle.xpAwarded || shouldAwardXp,
      });

      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
        ...(shouldAwardXp
          ? applyOptimisticXpOutcome(state.currentXP, outcome!)
          : {}),
      }));

      return updatedTask;
    }

    const taskToToggle = get().tasks.find((t) => t.id === id);
    if (!taskToToggle) return;

    const nextCompleted = !taskToToggle.completed;
    const shouldAwardXp = nextCompleted && !taskToToggle.xpAwarded;
    const completedOn = nextCompleted ? formatLocalDateOnly() : null;
    const outcome = shouldAwardXp && completedOn
      ? getOptimisticCompletionOutcome({
          currentXP: get().currentXP,
          task: taskToToggle,
          tasks: get().tasks,
          completedOn,
          aiTone: useAuthStore.getState().aiTone,
        })
      : null;
    const updatedTask = normalizeTask({
      ...taskToToggle,
      completed: nextCompleted,
      completedOn,
      xpAwarded: taskToToggle.xpAwarded || shouldAwardXp,
    });
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      ...(shouldAwardXp
        ? applyOptimisticXpOutcome(state.currentXP, outcome!)
        : {}),
    }));
    await persistAndQueue(get().tasks, {
      kind: "task.update",
      entityId: id,
      payload: {
        completed: nextCompleted,
        completedOn: updatedTask.completedOn,
      },
    });
    return updatedTask;
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

    const taskToUpdate = get().tasks.find((task) => task.id === id);
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
    await persistAndQueue(get().tasks, {
      kind: "task.update",
      entityId: id,
      payload: updatedData,
    });
    return updatedTask;
  },

  fetchTasks: async () => {
    if (isGuestSession()) {
      set({ isLoading: false });
      return;
    }

    const hasCachedTasks = get().tasks.length > 0;
    set({ isLoading: !hasCachedTasks });
    if (!navigator.onLine) {
      set({ isLoading: false });
      return;
    }
    try {
      await syncOfflineTasks();
      const response = await TaskApi.getTasks();
      set({ tasks: response.map(normalizeTask) });
      await persistActiveTaskSnapshot(response.map(normalizeTask));
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error("TASK_REQUEST_FAILED");
      } else if (e instanceof Error) {
        console.error("TASK_REQUEST_FAILED");
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
        console.error("TASK_REQUEST_FAILED");
      } else if (e instanceof Error) {
        console.error("TASK_REQUEST_FAILED");
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

    const taskToUpdate = get().tasks.find((task) => task.id === taskId);
    if (!taskToUpdate) return;

    const newSub: SubTask = {
      id: createOfflineEntityId(),
      taskId,
      title,
      completed: false,
      position: taskToUpdate.subtasks?.length ?? 0,
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
    await persistAndQueue(get().tasks, {
      kind: "subtask.create",
      entityId: newSub.id,
      taskId,
      payload: {
        title: newSub.title,
        completed: newSub.completed,
        position: newSub.position,
      },
    });
    return newSub;
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
    if (!updatedSub) return;
    await persistAndQueue(get().tasks, {
      kind: "subtask.update",
      entityId: subTaskId,
      taskId,
      payload: { completed },
    });
    return updatedSub;
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
    if (!updatedSub) return;
    await persistAndQueue(get().tasks, {
      kind: "subtask.update",
      entityId: subTaskId,
      taskId,
      payload,
    });
    return updatedSub;
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
    await persistAndQueue(get().tasks, {
      kind: "subtask.delete",
      entityId: subTaskId,
      taskId,
      payload: {},
    });
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
    version: 2,
    merge: (persistedState, currentState) => ({
      ...currentState,
      ...(persistedState as Partial<TaskStore>),
      filterStatus: "Активные",
    }),
    partialize: (state) => ({
      tasks: isGuestSession() ? state.tasks : [],
      sortField: state.sortField,
      sortDirection: state.sortDirection,
      userLevel: isGuestSession() ? state.userLevel : 1,
      currentXP: isGuestSession() ? state.currentXP : 0,
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
export const useCompletionNotice = () =>
  useTaskStore((state) => state.completionNotice);
export const useSetCompletionNotice = () =>
  useTaskStore((state) => state.setCompletionNotice);
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
