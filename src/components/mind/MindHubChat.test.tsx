// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

class MockSpeechRecognition {
  static instance: MockSpeechRecognition | null = null;

  lang = "";
  continuous = true;
  interimResults = true;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instance = this;
  }
}

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
  MockSpeechRecognition.instance = null;
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

describe("MindHubChat", () => {
  it("shows a reply without creating a task", async () => {
    parseMindHub.mockResolvedValue({ drafts: [], reply: "Можно начать с паузы." });

    render(<MindHubChat variant="quick" />);
    sendMessage("Как немного восстановиться?");

    expect(await screen.findByText("Можно начать с паузы.")).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("does not repeat the unloading heading in the quick sheet variant", () => {
    render(<MindHubChat variant="quick" />);

    expect(
      screen.queryByRole("heading", { name: "Разгрузка мыслей" })
    ).not.toBeInTheDocument();
  });

  it("uses a full-height surface and Glowy AI heading on the full page", () => {
    const { container } = render(<MindHubChat variant="page" />);

    expect(container.querySelector("section")).toHaveClass("h-full", "min-h-0");
    expect(
      screen.getByRole("heading", { name: "Glowy AI" })
    ).toBeInTheDocument();
  });

  it("adds recognized Russian speech to the message draft without sending it", () => {
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });
    render(<MindHubChat variant="page" />);
    fireEvent.change(screen.getByPlaceholderText(/Например:/), {
      target: { value: "Нужно" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Начать голосовой ввод" }));

    const recognition = MockSpeechRecognition.instance;
    expect(recognition).not.toBeNull();
    expect(recognition?.lang).toBe("ru-RU");
    expect(recognition?.continuous).toBe(true);
    expect(recognition?.interimResults).toBe(true);
    expect(recognition?.start).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Остановить голосовой ввод" })
    ).toBeInTheDocument();

    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "купить продукты" } }],
      });
    });
    expect(screen.getByPlaceholderText(/Например:/)).toHaveValue(
      "Нужно купить продукты"
    );

    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: true, 0: { transcript: "купить продукты" } },
          { isFinal: false, 0: { transcript: "и молоко" } },
        ],
      });
    });
    expect(screen.getByPlaceholderText(/Например:/)).toHaveValue(
      "Нужно купить продукты и молоко"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Остановить голосовой ввод" })
    );
    expect(recognition?.stop).toHaveBeenCalledOnce();

    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: true, 0: { transcript: "купить продукты" } },
          { isFinal: true, 0: { transcript: "и молоко" } },
        ],
      });
      recognition?.onend?.();
    });

    expect(screen.getByPlaceholderText(/Например:/)).toHaveValue(
      "Нужно купить продукты и молоко"
    );
    expect(parseMindHub).not.toHaveBeenCalled();
  });

  it("keeps listening across browser pauses and stops after seven silent seconds", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });
    render(<MindHubChat variant="page" />);

    fireEvent.click(screen.getByRole("button", { name: "Начать голосовой ввод" }));
    const recognition = MockSpeechRecognition.instance;

    act(() => recognition?.onend?.());
    expect(recognition?.start).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "Остановить голосовой ввод" })
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6_000));
    act(() =>
      recognition?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "Купить" } }],
      })
    );
    act(() => vi.advanceTimersByTime(6_999));
    expect(recognition?.stop).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(recognition?.stop).toHaveBeenCalledOnce();

    act(() => recognition?.onend?.());
    expect(
      screen.getByRole("button", { name: "Начать голосовой ввод" })
    ).toBeInTheDocument();
    expect(recognition?.start).toHaveBeenCalledTimes(2);
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
