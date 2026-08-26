// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskDraft } from "../types";

const postTask = vi.fn();
const getTasks = vi.fn();
const putTask = vi.fn();
const trackProductEventOnce = vi.fn();
const enqueueTaskOperation = vi.fn();
const persistActiveTaskSnapshot = vi.fn();
const syncOfflineTasks = vi.fn();

vi.mock("../api/TaskApi", () => ({
  TaskApi: { getTasks, postTask, putTask },
}));

vi.mock("../utils/analytics", () => ({ trackProductEventOnce }));
vi.mock("../offline/taskOfflineQueue", () => ({
  createOfflineEntityId: () => -1,
  enqueueTaskOperation,
}));
vi.mock("../offline/taskOfflineSync", () => ({
  getActiveOfflineOwnerKey: () => "user:1",
  persistActiveTaskSnapshot,
  syncOfflineTasks,
}));

const { useAuthStore } = await import("./useAuthStore");
const { useTaskStore } = await import("./useTaskStore");

const draft: TaskDraft = {
  title: "Подготовить тест",
  date: "2026-08-09",
  priority: "⚡️ P2",
  category: "Учеба",
  energyLevel: "med",
  completed: false,
  subtasks: [],
};

afterEach(() => {
  postTask.mockReset();
  getTasks.mockReset();
  putTask.mockReset();
  trackProductEventOnce.mockReset();
  enqueueTaskOperation.mockReset();
  persistActiveTaskSnapshot.mockReset();
  syncOfflineTasks.mockReset();
  useAuthStore.setState({ isAuthenticated: false, isGuest: false, token: null });
  useTaskStore.setState({ tasks: [] });
});

describe("task activation analytics", () => {
  it("records the milestone after an authenticated task is created", async () => {
    useAuthStore.setState({ isAuthenticated: true, isGuest: false });
    postTask.mockResolvedValue({
      ...draft,
      id: 1,
      completed: false,
      xpAwarded: false,
      subtasks: [],
    });

    await useTaskStore.getState().createTask(draft);

    expect(trackProductEventOnce).toHaveBeenCalledWith("first_task_created");
  });

  it("does not record an activation event for a guest-local task", async () => {
    useAuthStore.setState({ isAuthenticated: true, isGuest: true });

    await useTaskStore.getState().createTask(draft);

    expect(postTask).not.toHaveBeenCalled();
    expect(trackProductEventOnce).not.toHaveBeenCalled();
  });

  it("keeps the current task list when the API response is not a task array", async () => {
    useAuthStore.setState({ isAuthenticated: true, isGuest: false });
    useTaskStore.setState({
      tasks: [
        {
          ...draft,
          id: 1,
          completed: false,
          completedOn: null,
          xpAwarded: false,
          actualMinutes: null,
          estimatedMinutes: draft.estimatedMinutes ?? null,
          subtasks: [],
        },
      ],
    });
    postTask.mockReset();

    // This mirrors an invalid response without allowing it to crash the task store.
    getTasks.mockRejectedValueOnce(
      new Error("Сервер вернул некорректный список задач")
    );

    await useTaskStore.getState().fetchTasks();

    expect(useTaskStore.getState().tasks).toHaveLength(1);
  });

  it("normalizes old tasks that do not have time fields", async () => {
    useAuthStore.setState({ isAuthenticated: true, isGuest: false });
    getTasks.mockResolvedValueOnce([
      {
        ...draft,
        id: 2,
        xpAwarded: false,
      },
    ]);

    await useTaskStore.getState().fetchTasks();

    expect(useTaskStore.getState().tasks[0]).toMatchObject({
      completedOn: null,
      estimatedMinutes: null,
      actualMinutes: null,
    });
  });

  it("undoes completion through the existing update flow", async () => {
    useAuthStore.setState({ isAuthenticated: true, isGuest: false });
    const completedTask = {
      ...draft,
      id: 3,
      completed: true,
      completedOn: "2026-08-09",
      xpAwarded: true,
      estimatedMinutes: 60,
      actualMinutes: 45,
      subtasks: [],
    };
    useTaskStore.setState({ tasks: [completedTask] });
    putTask.mockResolvedValueOnce({
      task: { ...completedTask, completed: false, completedOn: null },
      xpReward: 0,
      userProgress: null,
    });

    await useTaskStore.getState().toggleTask(completedTask.id);

    expect(enqueueTaskOperation).toHaveBeenCalledWith(
      "user:1",
      expect.objectContaining({
        kind: "task.update",
        entityId: completedTask.id,
        payload: expect.objectContaining({ completed: false, completedOn: null }),
      })
    );
    expect(useTaskStore.getState().tasks[0]).toMatchObject({
      completed: false,
      completedOn: null,
      actualMinutes: 45,
    });
  });
});
