// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../../types";

let behaviorMode: "calm" | "strict" = "calm";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock("framer-motion", () => ({
  motion: {
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => <li {...props}>{children}</li>,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));
vi.mock("../../store/useTaskStore", () => ({
  useTaskStore: (selector: (state: { tasks: Task[] }) => unknown) => selector({ tasks: [] }),
  useAddSubTask: () => vi.fn(),
  useToggleSubTask: () => vi.fn(),
}));
vi.mock("../../store/useAuthStore", () => ({
  useAiTone: () => behaviorMode,
}));
vi.mock("./EditTaskModal", () => ({ default: () => null }));

const { default: TaskItem } = await import("./TaskItem");

const task = (patch: Partial<Task> = {}): Task => ({
  id: 1,
  title: "Подготовить отчёт",
  date: "2020-01-01",
  priority: "⚡️ P2",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: 95,
  actualMinutes: null,
  subtasks: [],
  ...patch,
});

const renderTask = (value: Task) => render(
  <MemoryRouter>
    <TaskItem
      task={value}
      toggle={vi.fn()}
      onRequestDelete={vi.fn()}
      onRequestActualTime={vi.fn()}
    />
  </MemoryRouter>
);

afterEach(() => {
  behaviorMode = "calm";
  cleanup();
});

describe("TaskItem behavior presentation", () => {
  it("shows a planned duration and omits an empty duration marker", () => {
    renderTask(task());
    expect(screen.getByLabelText("Плановая длительность: 1 ч 35 мин")).toBeVisible();
    cleanup();
    renderTask(task({ estimatedMinutes: null }));
    expect(screen.queryByLabelText(/Плановая длительность/)).not.toBeInTheDocument();
  });

  it("uses red overdue styling only in strict mode", () => {
    const value = task();
    const calm = renderTask(value);
    expect(screen.getByText(/2020|янв/i)).not.toHaveClass("text-red-600");
    calm.unmount();
    behaviorMode = "strict";
    renderTask(value);
    expect(screen.getByText(/2020|янв/i)).toHaveClass("text-red-600");
  });
});
