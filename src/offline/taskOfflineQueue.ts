import type { SubTask, Task, TaskDraft } from "../types";
import { listTaskOperations, putTaskOperation, replaceTaskOperations } from "./taskOfflineDb";
import type { OfflineTaskOperation } from "./taskOfflineTypes";

let localId = -Date.now();

export const createOfflineEntityId = () => localId--;

const operationId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type OperationInput =
  | { kind: "task.create"; entityId: number; payload: TaskDraft }
  | { kind: "task.update"; entityId: number; payload: Partial<Task> }
  | { kind: "task.delete"; entityId: number; payload: Record<string, never> }
  | {
      kind: "subtask.create";
      entityId: number;
      taskId: number;
      payload: Pick<SubTask, "title" | "completed" | "position">;
    }
  | {
      kind: "subtask.update";
      entityId: number;
      taskId: number;
      payload: Partial<Pick<SubTask, "title" | "completed" | "position">>;
    }
  | {
      kind: "subtask.delete";
      entityId: number;
      taskId: number;
      payload: Record<string, never>;
    };

export const enqueueTaskOperation = async (
  ownerKey: string,
  input: OperationInput
) => {
  const operation = {
    ...input,
    id: operationId(),
    ownerKey,
    createdAt: new Date().toISOString(),
  } as OfflineTaskOperation;
  await putTaskOperation(operation);
  return operation;
};

export const compactTaskOperations = (
  operations: OfflineTaskOperation[]
): OfflineTaskOperation[] => {
  const result: OfflineTaskOperation[] = [];

  for (const operation of operations) {
    if (operation.kind === "subtask.delete" && operation.entityId < 0) {
      const createIndex = result.findIndex(
        (item) =>
          item.kind === "subtask.create" && item.entityId === operation.entityId
      );
      if (createIndex >= 0) {
        result.splice(createIndex, 1);
        for (let index = result.length - 1; index >= 0; index -= 1) {
          const item = result[index];
          if (
            item.kind === "subtask.update" &&
            item.entityId === operation.entityId
          ) {
            result.splice(index, 1);
          }
        }
        continue;
      }
    }

    if (operation.kind === "task.delete" && operation.entityId < 0) {
      const createIndex = result.findIndex(
        (item) =>
          item.kind === "task.create" && item.entityId === operation.entityId
      );
      if (createIndex >= 0) {
        result.splice(createIndex, 1);
        for (let index = result.length - 1; index >= 0; index -= 1) {
          const item = result[index];
          if (
            item.entityId === operation.entityId ||
            ("taskId" in item && item.taskId === operation.entityId)
          ) {
            result.splice(index, 1);
          }
        }
        continue;
      }
    }

    const previousIndex = result.findIndex(
      (item) =>
        item.kind === operation.kind && item.entityId === operation.entityId
    );
    if (
      previousIndex >= 0 &&
      (operation.kind === "task.update" || operation.kind === "subtask.update")
    ) {
      const previous = result[previousIndex];
      result[previousIndex] = {
        ...operation,
        payload: { ...previous.payload, ...operation.payload },
      } as OfflineTaskOperation;
      continue;
    }
    result.push(operation);
  }

  return result;
};

export const compactStoredTaskOperations = async (ownerKey: string) => {
  const compacted = compactTaskOperations(await listTaskOperations(ownerKey));
  await replaceTaskOperations(ownerKey, compacted);
  return compacted;
};
