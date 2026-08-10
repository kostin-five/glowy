// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskDraft } from "../types";

const postTask = vi.fn();
const getTasks = vi.fn();
const trackProductEventOnce = vi.fn();

vi.mock("../api/TaskApi", () => ({
  TaskApi: { getTasks, postTask },
}));

vi.mock("../utils/analytics", () => ({ trackProductEventOnce }));

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
  trackProductEventOnce.mockReset();
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
          xpAwarded: false,
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
});
