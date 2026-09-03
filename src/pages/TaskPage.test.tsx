// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import TaskPage from "./TaskPage";

vi.mock("../components/tasks/TaskControls", () => ({
  default: ({ onCreateClick }: { onCreateClick: () => void }) => (
    <button type="button" onClick={onCreateClick}>Добавить задачу</button>
  ),
}));
vi.mock("../components/tasks/TaskList", () => ({ default: () => <div>Список</div> }));

describe("TaskPage", () => {
  it("routes its create action to the global launcher", () => {
    const listener = vi.fn();
    window.addEventListener("glowy:open-task-create", listener);
    render(<MemoryRouter><TaskPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Добавить задачу" }));
    expect(listener).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    window.removeEventListener("glowy:open-task-create", listener);
  });
});
