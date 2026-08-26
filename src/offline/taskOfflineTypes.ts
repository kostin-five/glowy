import type { SubTask, Task, TaskDraft } from "../types";

export type OfflineSyncPhase =
  | "idle"
  | "offline"
  | "syncing"
  | "attention";

export interface OfflineTaskSnapshot {
  ownerKey: string;
  tasks: Task[];
  updatedAt: string;
}

export type OfflineTaskOperation =
  | {
      id: string;
      ownerKey: string;
      kind: "task.create";
      entityId: number;
      payload: TaskDraft;
      createdAt: string;
    }
  | {
      id: string;
      ownerKey: string;
      kind: "task.update";
      entityId: number;
      payload: Partial<Task>;
      createdAt: string;
    }
  | {
      id: string;
      ownerKey: string;
      kind: "task.delete";
      entityId: number;
      payload: Record<string, never>;
      createdAt: string;
    }
  | {
      id: string;
      ownerKey: string;
      kind: "subtask.create";
      entityId: number;
      taskId: number;
      payload: Pick<SubTask, "title" | "completed" | "position">;
      createdAt: string;
    }
  | {
      id: string;
      ownerKey: string;
      kind: "subtask.update";
      entityId: number;
      taskId: number;
      payload: Partial<Pick<SubTask, "title" | "completed" | "position">>;
      createdAt: string;
    }
  | {
      id: string;
      ownerKey: string;
      kind: "subtask.delete";
      entityId: number;
      taskId: number;
      payload: Record<string, never>;
      createdAt: string;
    };

export interface OfflineSyncState {
  phase: OfflineSyncPhase;
  pendingCount: number;
  error: string | null;
}
