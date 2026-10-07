// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiApi from "../../api/AiApi";
import AiSubtaskDraft from "./AiSubtaskDraft";
import { useAuthStore } from "../../store/useAuthStore";

beforeEach(() => useAuthStore.setState({ isGuest: false, userId: 7 }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const task = { title: "Подготовить запуск", category: "Работа", priority: "⚡️ P2" as const, energyLevel: "med" as const, estimatedMinutes: 60, existingSubtasks: [] };

describe("AiSubtaskDraft", () => {
  it("disables guest AI without invoking the provider or applying steps", () => {
    useAuthStore.setState({ isGuest: true, userId: null });
    const provider = vi.spyOn(AiApi, "createSubtaskDraft");
    const onApply = vi.fn();
    render(<AiSubtaskDraft task={task} onApply={onApply} />);
    expect(screen.getByRole("button", { name: "AI шаги" })).toBeDisabled();
    expect(screen.getByText(/AI недоступен в демо-режиме/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "AI шаги" }));
    expect(provider).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
  it("keeps provider output local until explicit apply", async () => {
    vi.spyOn(AiApi, "createSubtaskDraft").mockResolvedValue({
      subtasks: [{ title: "Собрать требования" }, { title: "Проверить сценарий" }],
      limit: { limit: 70, remaining: 69, resetAt: null },
    });
    const onApply = vi.fn();
    render(<AiSubtaskDraft task={task} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "AI шаги" }));
    expect(await screen.findByDisplayValue("Собрать требования")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Шаг 1"), { target: { value: "Уточнить требования" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить шаги" }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(["Уточнить требования", "Проверить сценарий"]));
  });

  it("cancels without applying and validates an empty title", async () => {
    const provider = vi.spyOn(AiApi, "createSubtaskDraft");
    const onApply = vi.fn();
    render(<AiSubtaskDraft task={{ ...task, title: "" }} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "AI шаги" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Сначала напиши название задачи");
    expect(provider).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть черновик" }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("retains only failed steps after a partial apply", async () => {
    vi.spyOn(AiApi, "createSubtaskDraft").mockResolvedValue({
      subtasks: [{ title: "Первый шаг" }, { title: "Второй шаг" }],
      limit: { limit: 70, remaining: 69, resetAt: null },
    });
    render(<AiSubtaskDraft task={task} onApply={async () => ({ failed: ["Второй шаг"] })} />);
    fireEvent.click(screen.getByRole("button", { name: "AI шаги" }));
    await screen.findByDisplayValue("Первый шаг");
    fireEvent.click(screen.getByRole("button", { name: "Добавить шаги" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("осталось 1");
    expect(screen.queryByDisplayValue("Первый шаг")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Второй шаг")).toBeInTheDocument();
  });
});
