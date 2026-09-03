// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DayPlanCandidate } from "../../dashboard/dayPlan";
import type { Task } from "../../types";
import DayPlanReviewDialog from "./DayPlanReviewDialog";

const task = (id: number, date: string): Task => ({
  id,
  title: `Задача ${id}`,
  date,
  priority: "⚡️ P2",
  category: "",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: 30,
  actualMinutes: null,
  subtasks: [],
});

const candidates: DayPlanCandidate[] = [
  { task: task(1, "2026-09-04"), isToday: true, reason: "Уже подходит плану." },
  { task: task(2, "2026-09-05"), isToday: false, reason: "Подходит по энергии." },
];

describe("DayPlanReviewDialog", () => {
  it("does not apply changes while reviewing, toggling or cancelling", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(<DayPlanReviewDialog isOpen candidates={candidates} onApply={onApply} onClose={onClose} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Задача 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("applies only selected ids and closes after success", async () => {
    const onApply = vi.fn().mockResolvedValue([]);
    const onClose = vi.fn();
    const onApplied = vi.fn();
    render(
      <DayPlanReviewDialog
        isOpen
        candidates={candidates}
        onApply={onApply}
        onApplied={onApplied}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Задача 1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить в план" }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith([2]));
    expect(onApplied).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps failed tasks selected and offers a retry", async () => {
    const onApply = vi.fn().mockResolvedValue([2]);
    render(<DayPlanReviewDialog isOpen candidates={candidates} onApply={onApply} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Добавить в план" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось добавить: 1");
    expect(screen.getByRole("checkbox", { name: /Задача 1/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Задача 2/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
  });
});
