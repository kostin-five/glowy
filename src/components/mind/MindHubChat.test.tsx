// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiApi from "../../api/AiApi";
import { useMindHubStore } from "../../store/useMindHubStore";
import MindHubChat from "./MindHubChat";

const createTask = vi.fn();
let isGuest = true;

vi.mock("../../api/AiApi", () => ({
  default: {
    parseMindHub: vi.fn(),
    getMindHubHistory: vi.fn(() => new Promise(() => undefined)),
    clearMindHubHistory: vi.fn(),
  },
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
  useEmail: () => "test@example.com",
  useIsGuest: () => isGuest,
}));

vi.mock("../../hooks/useNetworkStatus", () => ({ default: () => true }));
vi.mock("../../hooks/useTypewriter", () => ({
  default: (text: string) => ({ displayedText: text, isTyping: false }),
}));
vi.mock("../../utils/analytics", () => ({ trackProductEvent: vi.fn() }));

const parseMindHub = vi.mocked(AiApi.parseMindHub);
const getMindHubHistory = vi.mocked(AiApi.getMindHubHistory);
const clearMindHubHistory = vi.mocked(AiApi.clearMindHubHistory);

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
  useMindHubStore.setState({ ownerKey: null });
  useMindHubStore.getState().clearConversation();
  parseMindHub.mockReset();
  getMindHubHistory.mockReset();
  getMindHubHistory.mockImplementation(() => new Promise(() => undefined));
  clearMindHubHistory.mockReset();
  createTask.mockReset();
  MockSpeechRecognition.instance = null;
  isGuest = true;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

  it("replaces registered local content with server history without uploading it", async () => {
    isGuest = false;
    useMindHubStore.getState().appendMessage({ role: "user", text: "Старая локальная запись" });
    getMindHubHistory.mockResolvedValue({
      exchanges: [{
        id: 7,
        userMessage: { id: "7-user", role: "user", text: "Сообщение с сервера" },
        assistantMessage: { id: "7-assistant", role: "assistant", text: "Серверный ответ" },
        createdAt: "2026-08-12T00:00:00.000Z",
      }],
      nextCursor: null,
      hasMore: false,
    });

    render(<MindHubChat variant="page" />);

    expect(await screen.findByText("Сообщение с сервера")).toBeInTheDocument();
    expect(screen.queryByText("Старая локальная запись")).not.toBeInTheDocument();
    expect(parseMindHub).not.toHaveBeenCalled();
  });

  it("keeps cached registered history usable while owner history loads", () => {
    isGuest = false;
    useMindHubStore.getState().appendMessage({ role: "user", text: "История другого входа" });

    render(<MindHubChat variant="page" />);

    expect(screen.getByText("История другого входа")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Например:/)).toBeEnabled();
  });

  it("keeps chat working locally when history loading fails", async () => {
    isGuest = false;
    getMindHubHistory.mockRejectedValue(new Error("network"));
    parseMindHub.mockResolvedValue({ drafts: [], reply: "Локальный ответ", historySynced: false });
    render(<MindHubChat variant="page" />);
    sendMessage("Не потеряй этот текст");

    expect(await screen.findByText("Локальный ответ")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("история пока сохранена только на этом устройстве");
    expect(screen.getByRole("button", { name: "Повторить загрузку" })).toBeInTheDocument();
    expect(parseMindHub).toHaveBeenCalledOnce();
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

    fireEvent.click(screen.getByRole("button", { name: "Добавить задачу" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

    expect(screen.queryByText("Черновик задачи")).not.toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("clears server history only after explicit confirmation", async () => {
    isGuest = false;
    getMindHubHistory.mockResolvedValue({
      exchanges: [{ id: 11, userMessage: { id: "11-user", role: "user", text: "Личная запись" }, assistantMessage: { id: "11-assistant", role: "assistant", text: "Ответ" }, createdAt: "2026-08-12T00:00:00.000Z" }],
      nextCursor: null,
      hasMore: false,
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    clearMindHubHistory.mockResolvedValue();
    render(<MindHubChat variant="page" />);
    const clearButton = await screen.findByRole("button", { name: "Очистить историю" });

    fireEvent.click(clearButton);
    expect(clearMindHubHistory).not.toHaveBeenCalled();
    expect(screen.getByText("Личная запись")).toBeInTheDocument();

    fireEvent.click(clearButton);
    await waitFor(() => expect(clearMindHubHistory).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText("Личная запись")).not.toBeInTheDocument());
    confirm.mockRestore();
  });

  it("keeps server history visible when deletion fails", async () => {
    isGuest = false;
    getMindHubHistory.mockResolvedValue({
      exchanges: [{ id: 12, userMessage: { id: "12-user", role: "user", text: "Сохрани меня" }, assistantMessage: { id: "12-assistant", role: "assistant", text: "Сохраняю" }, createdAt: "2026-08-12T00:00:00.000Z" }],
      nextCursor: null,
      hasMore: false,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    clearMindHubHistory.mockRejectedValue(new Error("network"));
    render(<MindHubChat variant="page" />);

    fireEvent.click(await screen.findByRole("button", { name: "Очистить историю" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ничего не исчезло");
    expect(screen.getByText("Сохрани меня")).toBeInTheDocument();
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
