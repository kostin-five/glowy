import axios from "axios";
import { SubTaskApi } from "../api/SubTaskApi";
import { TaskApi } from "../api/TaskApi";
import { UserApi } from "../api/UserApi";
import type { Task, TaskCompletionOutcome, UserProgress } from "../types";
import {
  deleteTaskOperation,
  listTaskOperations,
  readTaskSnapshot,
  readTaskSnapshotRevision,
  replaceTaskOperations,
  writeTaskSnapshot,
  writeTaskSnapshotIfUnchanged,
} from "./taskOfflineDb";
import { compactStoredTaskOperations } from "./taskOfflineQueue";
import type {
  OfflineSyncState,
  OfflineTaskOperation,
} from "./taskOfflineTypes";

type TaskAdapter = {
  getTasks: () => Task[];
  setTasks: (tasks: Task[]) => void;
  setProgress?: (progress: UserProgress) => void;
  setCompletionOutcome?: (outcome: TaskCompletionOutcome | null) => void;
};

let activeOwnerKey: string | null = null;
let adapter: TaskAdapter | null = null;
let activeSync: { ownerKey: string; promise: Promise<void> } | null = null;
let rerunRequested = false;
let mutationRevision = 0;
let state: OfflineSyncState = {
  phase: "idle",
  pendingCount: 0,
  error: null,
};
const listeners = new Set<() => void>();
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("glowy-task-sync")
    : null;

const emit = (nextState: Partial<OfflineSyncState>) => {
  state = { ...state, ...nextState };
  listeners.forEach((listener) => listener());
  channel?.postMessage({ type: "state", ownerKey: activeOwnerKey, state });
};

export const subscribeTaskOfflineSync = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getTaskOfflineSyncState = () => state;

export const getActiveOfflineOwnerKey = () => activeOwnerKey;

export const markTaskOfflineMutation = () => {
  mutationRevision += 1;
  channel?.postMessage({ type: "mutation", ownerKey: activeOwnerKey });
};

export const persistActiveTaskSnapshot = async (tasks: Task[]) => {
  if (!activeOwnerKey) return;
  await writeTaskSnapshot(activeOwnerKey, tasks);
};

const replaceIds = (
  operations: OfflineTaskOperation[],
  taskIds: Map<number, number>,
  subTaskIds: Map<number, number>
) =>
  operations.map((operation) => ({
    ...operation,
    entityId:
      operation.kind.startsWith("task.")
        ? taskIds.get(operation.entityId) ?? operation.entityId
        : subTaskIds.get(operation.entityId) ?? operation.entityId,
    ...("taskId" in operation
      ? { taskId: taskIds.get(operation.taskId) ?? operation.taskId }
      : {}),
  })) as OfflineTaskOperation[];

export const processTaskOfflineOperation = async (
  operation: OfflineTaskOperation,
  currentTasks: Task[]
) => {
  const taskIds = new Map<number, number>();
  const subTaskIds = new Map<number, number>();
  let progress: UserProgress | null = null;
  let completionOutcome: TaskCompletionOutcome | null = null;

  switch (operation.kind) {
    case "task.create": {
      const created = await TaskApi.postTask(operation.payload);
      taskIds.set(operation.entityId, created.id);
      const localTask = currentTasks.find(
        (task) => task.id === operation.entityId
      );
      (localTask?.subtasks ?? []).forEach((subtask, index) => {
        const serverSubtask = created.subtasks?.[index];
        if (serverSubtask) subTaskIds.set(subtask.id, serverSubtask.id);
      });
      break;
    }
    case "task.update": {
      const result = await TaskApi.putTask(operation.entityId, operation.payload);
      if ("task" in result) {
        progress = result.userProgress;
        completionOutcome = result.xpOutcome ?? null;
      }
      break;
    }
    case "task.delete":
      await TaskApi.deleteTask(operation.entityId);
      break;
    case "subtask.create": {
      const created = await SubTaskApi.createSubTask(
        operation.taskId,
        operation.payload.title
      );
      subTaskIds.set(operation.entityId, created.id);
      if (
        operation.payload.completed ||
        operation.payload.position !== created.position
      ) {
        await SubTaskApi.updateSubTask(created.id, operation.payload);
      }
      break;
    }
    case "subtask.update":
      await SubTaskApi.updateSubTask(operation.entityId, operation.payload);
      break;
    case "subtask.delete":
      await SubTaskApi.deleteSubTask(operation.entityId);
      break;
  }

  return { taskIds, subTaskIds, progress, completionOutcome };
};

const isRetryableError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;
  return !error.response || error.response.status >= 500 || error.response.status === 429;
};

const runSync = async () => {
  if (!activeOwnerKey || !adapter || !navigator.onLine) {
    emit({ phase: navigator.onLine ? "idle" : "offline" });
    return;
  }

  const ownerKey = activeOwnerKey;
  const revisionAtStart = mutationRevision;
  let operations = await compactStoredTaskOperations(ownerKey);
  emit({
    phase: operations.length ? "syncing" : "idle",
    pendingCount: operations.length,
    error: null,
  });

  try {
    while (operations.length && activeOwnerKey === ownerKey) {
      const operation = operations[0];
      const { taskIds, subTaskIds, progress, completionOutcome } = await processTaskOfflineOperation(
        operation,
        adapter.getTasks()
      );
      if (progress) adapter.setProgress?.(progress);
      if (completionOutcome) adapter.setCompletionOutcome?.(completionOutcome);
      await deleteTaskOperation(operation.id);
      operations = replaceIds(operations.slice(1), taskIds, subTaskIds);
      await replaceTaskOperations(ownerKey, operations);

      if (taskIds.size || subTaskIds.size) {
        const remappedTasks = adapter.getTasks().map((task) => ({
          ...task,
          id: taskIds.get(task.id) ?? task.id,
          subtasks: task.subtasks?.map((subtask) => ({
            ...subtask,
            id: subTaskIds.get(subtask.id) ?? subtask.id,
            taskId: taskIds.get(subtask.taskId) ?? subtask.taskId,
          })),
        }));
        adapter.setTasks(remappedTasks);
        await writeTaskSnapshot(ownerKey, remappedTasks);
      }

      emit({ pendingCount: operations.length });
    }

    if (activeOwnerKey !== ownerKey) return;
    const snapshotRevisionBeforeRefresh =
      await readTaskSnapshotRevision(ownerKey);
    const serverTasks = await TaskApi.getTasks();
    const pendingOperations = await listTaskOperations(ownerKey);
    if (
      activeOwnerKey !== ownerKey ||
      revisionAtStart !== mutationRevision ||
      pendingOperations.length > 0
    ) {
      emit({
        phase: navigator.onLine ? "syncing" : "offline",
        pendingCount: pendingOperations.length,
      });
      return;
    }
    const snapshotUpdated = await writeTaskSnapshotIfUnchanged(
      ownerKey,
      serverTasks,
      snapshotRevisionBeforeRefresh
    );
    if (!snapshotUpdated || revisionAtStart !== mutationRevision) return;
    adapter.setTasks(serverTasks);
    adapter.setProgress?.(await UserApi.getProgress());
    emit({ phase: "idle", pendingCount: 0, error: null });
    channel?.postMessage({ type: "snapshot", ownerKey });
  } catch (error) {
    const pendingCount = (await listTaskOperations(ownerKey)).length;
    const isOffline = !navigator.onLine;
    const isRetryable = isRetryableError(error);
    emit({
      phase: isOffline ? "offline" : "attention",
      pendingCount,
      error: isOffline
        ? null
        : isRetryable
          ? "Сервер пока недоступен. Изменения сохранены на устройстве."
          : "Не удалось применить одно из изменений. Попробуй ещё раз.",
    });
  }
};

export const syncOfflineTasks = async () => {
  const ownerKey = activeOwnerKey;
  if (!ownerKey) return;

  const execute = () => {
    if (activeSync?.ownerKey === ownerKey) {
      rerunRequested = true;
      return activeSync.promise;
    }

    const previousSync = activeSync?.promise ?? Promise.resolve();
    const promise = previousSync
      .catch(() => undefined)
      .then(async () => {
        if (activeOwnerKey === ownerKey) await runSync();
      })
      .finally(() => {
        if (activeSync?.promise !== promise) return;

        activeSync = null;
        const shouldRerun =
          rerunRequested && activeOwnerKey === ownerKey && navigator.onLine;
        rerunRequested = false;
        if (shouldRerun) void syncOfflineTasks();
      });
    activeSync = { ownerKey, promise };
    return promise;
  };

  if (navigator.locks) {
    await navigator.locks.request(
      `glowy-task-sync:${ownerKey}`,
      { ifAvailable: true },
      async (lock) => {
        if (lock) await execute();
      }
    );
    return;
  }
  await execute();
};

export const initializeTaskOfflineSync = async (
  ownerKey: string | null,
  nextAdapter: TaskAdapter
) => {
  activeOwnerKey = ownerKey;
  adapter = nextAdapter;
  emit({ phase: navigator.onLine ? "idle" : "offline", pendingCount: 0, error: null });
  if (!ownerKey) {
    nextAdapter.setTasks([]);
    return;
  }

  const cachedTasks = await readTaskSnapshot(ownerKey);
  if (activeOwnerKey !== ownerKey) return;
  nextAdapter.setTasks(cachedTasks ?? []);
  const pendingCount = (await listTaskOperations(ownerKey)).length;
  emit({
    phase: navigator.onLine ? "idle" : "offline",
    pendingCount,
  });
  if (navigator.onLine) void syncOfflineTasks();
};

channel?.addEventListener("message", async (event) => {
  if (!activeOwnerKey || event.data?.ownerKey !== activeOwnerKey) return;
  if (event.data.type === "mutation") {
    mutationRevision += 1;
    return;
  }
  if (event.data.type === "state") {
    state = event.data.state;
    listeners.forEach((listener) => listener());
  }
  if (event.data.type === "snapshot" && adapter) {
    const tasks = await readTaskSnapshot(activeOwnerKey);
    if (tasks) adapter.setTasks(tasks);
  }
});
