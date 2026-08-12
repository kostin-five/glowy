// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiApi from "../../api/AiApi";
import { useMindHubStore } from "../../store/useMindHubStore";
import MindHubChat from "./MindHubChat";

const createTask = vi.fn();
const fetchTasks = vi.fn().mockResolvedValue(undefined);
let isGuest = true;

vi.mock("../../api/AiApi", () => ({
  default: {
    parseMindHub: vi.fn(),
    getMindHubHistory: vi.fn(() => new Promise(() => undefined)),
    updateMindHubDraft: vi.fn(),
    confirmMindHubDraft: vi.fn(),
    dismissMindHubDraft: vi.fn(),
    clearMindHubHistory: vi.fn(),
  },
}));

vi.mock("../../store/useTaskStore", () => ({
  useTaskStore: {
    getState: () => ({ createTask, fetchTasks }),
  },
}));

vi.mock("../../store/useAuthStore", () => ({
  GUEST_REQUEST_LIMIT: 3,
  useGuestRequestsCount: () => 0,
  useGuestRequestsResetDate: () => null,
  useIsGuest: () => isGuest,
}));

vi.mock("../../hooks/useNetworkStatus", () => ({ default: () => true }));
vi.mock("../../hooks/useTypewriter", () => ({
  default: (text: string) => ({ displayedText: text, isTyping: false }),
}));
vi.mock("../../utils/analytics", () => ({ trackProductEvent: vi.fn() }));

const parseMindHub = vi.mocked(AiApi.parseMindHub);
const getMindHubHistory = vi.mocked(AiApi.getMindHubHistory);
const updateMindHubDraft = vi.mocked(AiApi.updateMindHubDraft);
const confirmMindHubDraft = vi.mocked(AiApi.confirmMindHubDraft);
const dismissMindHubDraft = vi.mocked(AiApi.dismissMindHubDraft);
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
  useMindHubStore.getState().clearConversation();
  parseMindHub.mockReset();
  getMindHubHistory.mockReset();
  getMindHubHistory.mockImplementation(() => new Promise(() => undefined));
  updateMindHubDraft.mockReset();
  confirmMindHubDraft.mockReset();
  dismissMindHubDraft.mockReset();
  clearMindHubHistory.mockReset();
  createTask.mockReset();
  fetchTasks.mockClear();
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
        drafts: [],
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

  it("does not render cached registered history before owner history loads", () => {
    isGuest = false;
    useMindHubStore.getState().appendMessage({ role: "user", text: "История другого входа" });

    render(<MindHubChat variant="page" />);

    expect(screen.queryByText("История другого входа")).not.toBeInTheDocument();
    expect(screen.getByText("Загружаю историю…")).toBeInTheDocument();
  });

  it("shows a retry action after history loading fails and keeps typed text", async () => {
    isGuest = false;
    getMindHubHistory.mockRejectedValue(new Error("network"));
    render(<MindHubChat variant="page" />);
    const input = screen.getByPlaceholderText(/Например:/);
    fireEvent.change(input, { target: { value: "Не потеряй этот текст" } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось загрузить историю");
    expect(screen.getByRole("button", { name: "Повторить загрузку" })).toBeInTheDocument();
    expect(input).toHaveValue("Не потеряй этот текст");
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

  it("confirms a synchronized draft through the server only once", async () => {
    isGuest = false;
    const serverDraft = {
      title: "Сделать уроки", date: "2026-08-13", priority: "⚡️ P2" as const, category: "Учеба",
      completed: false, energyLevel: "med" as const, subtasks: [], id: 19, version: 1, status: "pending" as const,
    };
    getMindHubHistory.mockResolvedValue({
      exchanges: [{ id: 10, userMessage: { id: "10-user", role: "user", text: "Нужно сделать уроки" }, assistantMessage: { id: "10-assistant", role: "assistant", text: "Подготовил черновик" }, drafts: [serverDraft], createdAt: "2026-08-12T00:00:00.000Z" }],
      nextCursor: null,
      hasMore: false,
    });
    updateMindHubDraft.mockResolvedValue({
      title: "Сделать уроки", date: "2026-08-13", priority: "⚡️ P2", category: "Учеба",
      completed: false, energyLevel: "med", subtasks: [], id: 19, version: 2, status: "pending",
    });
    confirmMindHubDraft.mockResolvedValue({
      draft: { title: "Сделать уроки", date: "2026-08-13", priority: "⚡️ P2", category: "Учеба", completed: false, energyLevel: "med", subtasks: [], id: 19, version: 2, status: "confirmed" },
      task: { id: 55, title: "Сделать уроки", date: "2026-08-13", priority: "⚡️ P2", category: "Учеба", completed: false, xpAwarded: false, energyLevel: "med", subtasks: [] },
    });

    render(<MindHubChat variant="page" />);
    fireEvent.click(await screen.findByRole("button", { name: "Добавить задачу" }));

    await waitFor(() => expect(confirmMindHubDraft).toHaveBeenCalledWith(19, 2));
    expect(createTask).not.toHaveBeenCalled();
  });

  it("clears server history only after explicit confirmation", async () => {
    isGuest = false;
    getMindHubHistory.mockResolvedValue({
      exchanges: [{ id: 11, userMessage: { id: "11-user", role: "user", text: "Личная запись" }, assistantMessage: { id: "11-assistant", role: "assistant", text: "Ответ" }, drafts: [], createdAt: "2026-08-12T00:00:00.000Z" }],
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
      exchanges: [{ id: 12, userMessage: { id: "12-user", role: "user", text: "Сохрани меня" }, assistantMessage: { id: "12-assistant", role: "assistant", text: "Сохраняю" }, drafts: [], createdAt: "2026-08-12T00:00:00.000Z" }],
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
