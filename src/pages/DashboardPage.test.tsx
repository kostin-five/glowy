// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import DashboardPage from "./DashboardPage";

vi.mock("../hooks/useMediaQuery", () => ({ default: () => false }));
vi.mock("../components/layout/EnergySlider", () => ({ EnergySlider: () => null }));
vi.mock("../components/mind/MindHubChat", () => ({ default: () => null }));

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

beforeEach(() => {
  localStorage.clear();
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
    expect(screen.getAllByText("Подготовить план недели").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByLabelText("Подзадачи: 1 из 2").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: "Отметить задачу выполненной" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить задачу" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать задачу" })).not.toBeInTheDocument();
  });
});
