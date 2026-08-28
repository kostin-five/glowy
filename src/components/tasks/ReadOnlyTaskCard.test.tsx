// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Task } from "../../types";
import ReadOnlyTaskCard from "./ReadOnlyTaskCard";

const task: Task = {
  id: 1,
  title: "Подготовить большой отчёт",
  date: "2026-08-28",
  priority: "⚡️ P2",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: 45,
  actualMinutes: null,
  subtasks: [
    { id: 1, taskId: 1, title: "План", completed: true, position: 0 },
    { id: 2, taskId: 1, title: "Текст", completed: false, position: 1 },
  ],
};

describe("ReadOnlyTaskCard", () => {
  it("shows familiar metadata without mutation controls", () => {
    render(<ReadOnlyTaskCard task={task} />);
    expect(screen.getByText("Средний")).toBeVisible();
    expect(screen.getByText("45 мин")).toBeVisible();
    expect(screen.getByLabelText("Подзадачи: 1 из 2")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).not.toHaveAttribute("draggable");
  });
});

