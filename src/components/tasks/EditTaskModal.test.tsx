// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/useAuthStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useTaskStore } from "../../store/useTaskStore";
import type { Task } from "../../types";
import EditTaskModal from "./EditTaskModal";

const task: Task = {
  id: 7,
  userId: 10,
  title: "Подготовить письмо",
  date: "2026-09-05",
  priority: "🔥 P1",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "high",
  estimatedMinutes: 45,
  actualMinutes: null,
  subtasks: [],
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ userId: 10, isGuest: false });
  useSettingsStore.setState({ taskFormPreferencesByAccount: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EditTaskModal", () => {
  it("preserves values while changing form modes", () => {
    render(<EditTaskModal isOpen onClose={vi.fn()} task={task} />);

    expect(screen.getByLabelText("Категория")).toHaveValue("Работа");
    fireEvent.click(screen.getByRole("button", { name: "Коротко" }));
    expect(screen.queryByLabelText("Категория")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Полно" }));
    expect(screen.getByLabelText("Категория")).toHaveValue("Работа");
    expect(screen.getByText("Подзадачи")).toBeVisible();
  });

  it("saves original energy and priority when both fields are hidden", async () => {
    useSettingsStore.setState({
      taskFormPreferencesByAccount: {
        "user:10": {
          mode: "medium",
          fields: { energy: false, priority: false },
        },
      },
    });
    const updateTask = vi.fn().mockResolvedValue(task);
    useTaskStore.setState({ updateTask });

    render(<EditTaskModal isOpen onClose={vi.fn()} task={task} />);
    expect(screen.queryByLabelText("Приоритет")).not.toBeInTheDocument();
    expect(screen.queryByText("Энергозатратность:")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Название задачи"), {
      target: { value: "Подготовить важное письмо" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить задачу" }));

    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(
        task.id,
        expect.objectContaining({
          title: "Подготовить важное письмо",
          energyLevel: "high",
          priority: "🔥 P1",
        })
      );
    });
  });
});
