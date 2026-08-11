// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiApi from "../../api/AiApi";
import { useMindHubStore } from "../../store/useMindHubStore";
import MindHubChat from "./MindHubChat";

const createTask = vi.fn();

vi.mock("../../api/AiApi", () => ({
  default: { parseMindHub: vi.fn() },
}));

vi.mock("../../store/useTaskStore", () => ({
  useTaskStore: {
    getState: () => ({ createTask }),
  },
}));

vi.mock("../../store/useAuthStore", () => ({
  GUEST_REQUEST_LIMIT: 3,
  useGuestRequestsCount: () => 0,
  useGuestRequestsResetDate: () => null,
  useIsGuest: () => false,
}));

vi.mock("../../hooks/useNetworkStatus", () => ({ default: () => true }));
vi.mock("../../hooks/useTypewriter", () => ({
  default: (text: string) => ({ displayedText: text, isTyping: false }),
}));
vi.mock("../../utils/analytics", () => ({ trackProductEvent: vi.fn() }));

const parseMindHub = vi.mocked(AiApi.parseMindHub);

const sendMessage = (text: string) => {
  fireEvent.change(screen.getByPlaceholderText(/Например:/), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Отправить мысли" }));
};

beforeEach(() => {
  HTMLElement.prototype.scrollTo = vi.fn();
  localStorage.clear();
  useMindHubStore.getState().clearConversation();
  parseMindHub.mockReset();
  createTask.mockReset();
});

describe("MindHubChat", () => {
  it("shows a reply without creating a task", async () => {
    parseMindHub.mockResolvedValue({ drafts: [], reply: "Можно начать с паузы." });

    render(<MindHubChat variant="quick" />);
    sendMessage("Как немного восстановиться?");

    expect(await screen.findByText("Можно начать с паузы.")).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("keeps an AI draft unsaved until explicit confirmation", async () => {
    parseMindHub.mockResolvedValue({
      reply: "Я подготовил черновик.",
      drafts: [
        {
          title: "Ответить преподавателю",
          date: "2026-08-13",
          priority: "⚡️ P2",
          category: "Учеба",
          completed: false,
          energyLevel: "low",
          subtasks: [],
        },
      ],
    });
    createTask.mockResolvedValue({
      id: 42,
      title: "Ответить преподавателю",
      date: "2026-08-13",
      priority: "⚡️ P2",
      category: "Учеба",
      completed: false,
      xpAwarded: false,
      energyLevel: "low",
      subtasks: [],
    });

    render(<MindHubChat variant="quick" />);
    sendMessage("Нужно ответить преподавателю");

    expect(await screen.findByText("Черновик задачи")).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Создать задачу" }));

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Задача «Ответить преподавателю» сохранена/)).toBeInTheDocument();
  });

  it("rejects a draft without creating a task", async () => {
    useMindHubStore.getState().addDrafts([
      {
        title: "Купить продукты",
        date: "2026-08-13",
        priority: "⚡️ P2",
        category: "Быт",
        completed: false,
        energyLevel: "low",
        subtasks: [],
      },
    ]);

    render(<MindHubChat variant="quick" />);
    fireEvent.click(screen.getByRole("button", { name: "Не сохранять" }));

    expect(screen.queryByText("Черновик задачи")).not.toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("shows a calm error without changing tasks", async () => {
    parseMindHub.mockRejectedValue(new Error("network"));

    render(<MindHubChat variant="quick" />);
    sendMessage("Помоги разобрать мысль");

    expect(
      await screen.findByText(
        "Не получилось обработать сообщение. Попробуй отправить ещё раз."
      )
    ).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });
});
