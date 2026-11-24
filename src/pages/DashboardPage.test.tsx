// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import DashboardPage from "./DashboardPage";

vi.mock("../queries/progress/progressQueries", () => ({
  useProgressOverview: () => ({ data: { taskStreak: { current: 3 } } }),
}));
const updateTask = vi.fn();

vi.mock("../components/layout/EnergySlider", () => ({ EnergySlider: () => null }));
vi.mock("../components/mind/MindHubChat", () => ({ default: () => null }));

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

beforeEach(() => {
  localStorage.clear();
  updateTask.mockReset();
  updateTask.mockImplementation(async (id, data) => {
    const current = useTaskStore.getState().tasks.find((task) => task.id === id);
    return current ? { ...current, ...data } : undefined;
  });
  useAuthStore.setState({ name: "Тест", currentEnergy: 60 });
  useTaskStore.setState({
    userLevel: 3,
    tasks: [{
      id: 1,
      title: "Подготовить план недели",
      date: today(),
      priority: "⚡️ P2",
      category: "Работа",
      completed: false,
      completedOn: null,
      xpAwarded: false,
      energyLevel: "med",
      estimatedMinutes: 45,
      actualMinutes: null,
      subtasks: [
        { id: 1, taskId: 1, title: "Собрать идеи", completed: true, position: 0 },
        { id: 2, taskId: 1, title: "Расставить приоритеты", completed: false, position: 1 },
      ],
    }],
    updateTask,
  });
});

describe("DashboardPage", () => {
  it("shows familiar read-only task cards without dashboard mutations", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Привет, Тест" })).toBeVisible();
    expect(screen.getByText("Подготовить план недели")).toBeVisible();
    expect(screen.getByLabelText("Подзадачи: 1 из 2")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Отметить задачу выполненной" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить задачу" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать задачу" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Недавно добавлено" })).not.toBeInTheDocument();
  });

  it("shows the existing streak and links directly to its details", () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Серия побед" })).toBeVisible();
    expect(screen.getByText("3 дня подряд")).toBeVisible();
    expect(screen.getByRole("link", { name: "Весь прогресс" })).toHaveAttribute("href", "/progress?tab=streak");
  });

  it("shows only tasks scheduled for today without mutating them", () => {
    useTaskStore.setState((state) => ({
      tasks: [
        ...state.tasks,
        {
          ...state.tasks[0],
          id: 2,
          title: "Подготовить следующий шаг",
          date: "2099-01-01",
        },
      ],
    }));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: "Настроить план" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "План на сегодня" })).not.toBeInTheDocument();
    expect(screen.queryByText(/План на сегодня готов/)).not.toBeInTheDocument();
    expect(screen.queryByText("Подготовить следующий шаг")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Фокус дня" })).not.toBeInTheDocument();
    expect(updateTask).not.toHaveBeenCalled();
  });
});
