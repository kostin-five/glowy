// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/useAuthStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useTaskStore } from "../../store/useTaskStore";
import type { Task, TaskDraft } from "../../types";
import CreateTaskModal from "./CreateTaskModal";

const createdTask = (draft: TaskDraft): Task => ({
  id: 101,
  userId: 10,
  ...draft,
  title: draft.title,
  date: draft.date || "",
  category: draft.category || "",
  completedOn: null,
  xpAwarded: false,
  estimatedMinutes: draft.estimatedMinutes ?? null,
  actualMinutes: null,
  subtasks: [],
});

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ userId: 10, isGuest: false });
  useSettingsStore.setState({ taskFormPreferencesByAccount: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreateTaskModal", () => {
  it("creates a title-only task once with compatible defaults", async () => {
    let resolveCreate: ((task: Task) => void) | undefined;
    const createTask = vi.fn(
      (draft: TaskDraft) =>
        new Promise<Task>((resolve) => {
          resolveCreate = () => resolve(createdTask(draft));
        })
    );
    useTaskStore.setState({ createTask });

    render(<CreateTaskModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Название задачи" }), {
      target: { value: "Позвонить врачу" },
    });
    const save = screen.getByRole("button", { name: "Сохранить задачу" });
    fireEvent.click(save);
    fireEvent.click(save);

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Позвонить врачу",
        date: "",
        priority: "⚡️ P2",
        energyLevel: "med",
      })
    );

    resolveCreate?.(createdTask(createTask.mock.calls[0][0]));
    await waitFor(() => expect(save).not.toBeDisabled());
  });

  it("keeps the draft after a failed save and validates blank title", async () => {
    const createTask = vi.fn().mockResolvedValue(undefined);
    useTaskStore.setState({ createTask });

    render(<CreateTaskModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Сохранить задачу" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Название задачи не может быть пустым"
    );
    expect(createTask).not.toHaveBeenCalled();

    const title = screen.getByRole("textbox", { name: "Название задачи" });
    fireEvent.change(title, { target: { value: "Сохранить черновик" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить задачу" }));

    await screen.findByText("Не удалось создать задачу. Попробуй ещё раз.");
    expect(title).toHaveValue("Сохранить черновик");
  });

  it("cancels without creating a task", () => {
    const createTask = vi.fn();
    const onClose = vi.fn();
    useTaskStore.setState({ createTask });

    render(<CreateTaskModal isOpen onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Название задачи"), {
      target: { value: "Не сохранять" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

    expect(createTask).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps compatible defaults when energy and priority are hidden", async () => {
    useSettingsStore.setState({
      taskFormPreferencesByAccount: {
        "user:10": {
          mode: "medium",
          fields: { energy: false, priority: false },
        },
      },
    });
    const createTask = vi.fn((draft: TaskDraft) =>
      Promise.resolve(createdTask(draft))
    );
    useTaskStore.setState({ createTask });

    render(<CreateTaskModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByLabelText("Приоритет")).not.toBeInTheDocument();
    expect(screen.queryByText("Энергозатратность:")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Название задачи"), {
      target: { value: "Простая задача" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить задачу" }));

    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({ energyLevel: "med", priority: "⚡️ P2" })
      );
    });
  });

  it("switches modes without losing entered values", () => {
    render(<CreateTaskModal isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Категория"), {
      target: { value: "Личное" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Коротко" }));
    expect(screen.queryByLabelText("Категория")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Полно" }));
    expect(screen.getByLabelText("Категория")).toHaveValue("Личное");
  });
});
