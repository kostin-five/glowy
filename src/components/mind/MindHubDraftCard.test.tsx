// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MindHubDraft } from "../../api/AiApi";
import MindHubDraftCard from "./MindHubDraftCard";

const draft: MindHubDraft = {
  title: "Подготовить доклад",
  date: "2026-08-13",
  priority: "⚡️ P2",
  category: "Учеба",
  completed: false,
  energyLevel: "high",
  subtasks: [
    { title: "Собрать источники", completed: false, position: 0 },
    { title: "Сделать слайды", completed: false, position: 1 },
  ],
};

describe("MindHubDraftCard", () => {
  it("submits an edited task only after explicit confirmation", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <MindHubDraftCard
        draft={draft}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Название задачи"), {
      target: { value: "Подготовить короткий доклад" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Подготовить короткий доклад" })
    );
  });

  it("dismisses a draft without confirming it", () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();

    render(
      <MindHubDraftCard
        draft={draft}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Не сохранять" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("blocks repeated confirmation while a save is pending", async () => {
    let resolveSave: (() => void) | undefined;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => { resolveSave = resolve; })
    );

    render(
      <MindHubDraftCard
        draft={draft}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />
    );

    const confirm = screen.getByRole("button", { name: "Создать задачу" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Сохраняю…" })).toBeDisabled();

    resolveSave?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Создать задачу" })).toBeEnabled()
    );
  });

  it("keeps the draft available when saving fails", async () => {
    const onConfirm = vi
      .fn()
      .mockRejectedValueOnce(new Error("Сеть недоступна"))
      .mockResolvedValueOnce(undefined);

    render(
      <MindHubDraftCard
        draft={draft}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));
    expect(await screen.findByText("Сеть недоступна")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Повторить сохранение" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
  });

  it("adds, edits and removes draft steps before confirmation", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <MindHubDraftCard
        draft={draft}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Шаг 1"), {
      target: { value: "Найти три источника" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Удалить шаг 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить шаг" }));
    fireEvent.change(screen.getByLabelText("Шаг 2"), {
      target: { value: "Проверить структуру" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        subtasks: [
          { title: "Найти три источника", completed: false, position: 0 },
          { title: "Проверить структуру", completed: false, position: 1 },
        ],
      })
    );
  });

  it("blocks an AI title longer than the task limit", () => {
    render(
      <MindHubDraftCard
        draft={{ ...draft, title: "А".repeat(256) }}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByText("Сократи название до 255 символов")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать задачу" })).toBeDisabled();
  });

  it("drops duplicate steps and keeps sequential positions", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <MindHubDraftCard
        draft={{
          ...draft,
          subtasks: [
            { title: "Собрать источники", completed: false, position: 4 },
            { title: " собрать источники ", completed: false, position: 8 },
            { title: "Сделать слайды", completed: false, position: 12 },
          ],
        }}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        subtasks: [
          { title: "Собрать источники", completed: false, position: 0 },
          { title: "Сделать слайды", completed: false, position: 1 },
        ],
      })
    );
  });
});
