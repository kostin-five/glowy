// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NoteTaskDraftDialog from "../components/notes/NoteTaskDraftDialog";
import type { TaskDraft } from "../types";

const draft: TaskDraft = {
  title: "Записаться к врачу",
  date: "",
  priority: "⚡️ P2",
  energyLevel: "med",
  category: "Здоровье",
  completed: false,
  subtasks: [],
};

describe("черновик задачи из заметки", () => {
  it("закрывается без подтверждения", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<NoteTaskDraftDialog draft={draft} busy={false} onChange={vi.fn()} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("блокирует повторное подтверждение во время создания", () => {
    const onConfirm = vi.fn();
    render(<NoteTaskDraftDialog draft={draft} busy onChange={vi.fn()} onClose={vi.fn()} onConfirm={onConfirm} />);
    const button = screen.getByRole("button", { name: "Создаём…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
