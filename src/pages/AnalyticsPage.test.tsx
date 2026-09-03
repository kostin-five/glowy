// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsApi } from "../api/AnalyticsApi";
import { useAuthStore } from "../store/useAuthStore";
import AnalyticsPage from "./AnalyticsPage";

vi.mock("../api/AnalyticsApi", () => ({
  AnalyticsApi: {
    getSnapshot: vi.fn(),
    requestInsight: vi.fn(),
  },
}));

vi.mock("../components/onboarding/FirstUsePopover", () => ({
  default: () => null,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  Cell: () => null,
  Legend: () => null,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const snapshot = {
  period: { kind: "week" as const, from: "2026-08-24", to: "2026-08-30" },
  completedTasks: 2,
  dailyCompleted: [{ date: "2026-08-24", completedTasks: 2 }],
  energyDistribution: { low: 0, med: 2, high: 0 },
  taskStreak: 1,
  time: {
    estimatedMinutes: 40,
    actualMinutes: 30,
    tasksWithEstimate: 2,
    tasksWithActual: 1,
  },
  hasActivity: true,
  canUseFocusFeatures: true,
  focusBetaAvailable: true,
  focusBetaEnabled: true,
  canRequestAiInsight: true,
};

const renderPage = () => render(
  <MemoryRouter>
    <AnalyticsPage />
  </MemoryRouter>
);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  useAuthStore.setState({ userId: 42, isGuest: false, isAuthenticated: true });
  vi.mocked(AnalyticsApi.getSnapshot).mockResolvedValue(snapshot);
  vi.mocked(AnalyticsApi.requestInsight).mockResolvedValue({
    insight: "## Итог\n\n**Две** задачи выполнены.",
    cost: 5,
    usage: { limit: 70, remaining: 65, resetAt: "2026-08-29T00:00:00Z" },
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("AnalyticsPage report", () => {
  it("makes no analytics or AI requests for a guest", () => {
    useAuthStore.setState({ userId: null, isGuest: true, isAuthenticated: false });
    renderPage();
    expect(screen.getByText("Аналитика сохраняется в аккаунте")).toBeTruthy();
    expect(AnalyticsApi.getSnapshot).not.toHaveBeenCalled();
    expect(AnalyticsApi.requestInsight).not.toHaveBeenCalled();
  });

  it("preserves the empty state without requesting AI or refetching the selected period", async () => {
    vi.mocked(AnalyticsApi.getSnapshot).mockResolvedValue({ ...snapshot, completedTasks: 0,
      dailyCompleted: [], hasActivity: false, canRequestAiInsight: false,
      energyDistribution: { low: 0, med: 0, high: 0 }, taskStreak: 0,
      time: { estimatedMinutes: 0, actualMinutes: 0, tasksWithEstimate: 0, tasksWithActual: 0 } });
    renderPage();
    expect(await screen.findByText("Здесь появится динамика после первой выполненной задачи.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(AnalyticsApi.getSnapshot).toHaveBeenCalledTimes(1);
    expect(AnalyticsApi.requestInsight).not.toHaveBeenCalled();
  });

  it("sends only one initial AI request when clicked twice", async () => {
    const pending = deferred<Awaited<ReturnType<typeof AnalyticsApi.requestInsight>>>();
    vi.mocked(AnalyticsApi.requestInsight).mockReturnValueOnce(pending.promise);
    renderPage();
    const button = await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(AnalyticsApi.requestInsight).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error("synthetic failure")));
    expect(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" })).toBeTruthy();
  });

  it("closes regeneration confirmation on account change", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" }));
    fireEvent.click(await screen.findByRole("button", { name: "Новый отчёт" }));
    expect(await screen.findByRole("button", { name: "Сделать новый" })).toBeTruthy();
    act(() => useAuthStore.setState({ userId: 43 }));
    expect(screen.queryByRole("button", { name: "Сделать новый" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Итог" })).toBeNull();
    expect(AnalyticsApi.requestInsight).toHaveBeenCalledTimes(1);
  });

  it("immediately hides loaded metrics and reloads when the owner changes", async () => {
    const next = deferred<typeof snapshot>();
    vi.mocked(AnalyticsApi.getSnapshot).mockResolvedValueOnce(snapshot).mockReturnValueOnce(next.promise);
    renderPage();
    expect(await screen.findByText("2", { exact: true })).toBeTruthy();
    act(() => useAuthStore.setState({ userId: 43 }));
    expect(screen.queryByText("2", { exact: true })).toBeNull();
    expect(screen.getByText("Собираю картину периода")).toBeTruthy();
    await act(async () => next.resolve({ ...snapshot, completedTasks: 7 }));
    expect(await screen.findByText("7", { exact: true })).toBeTruthy();
    expect(AnalyticsApi.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it("ignores the original owner snapshot even after switching A → B → A", async () => {
    const abandoned = deferred<typeof snapshot>();
    vi.mocked(AnalyticsApi.getSnapshot).mockReturnValueOnce(abandoned.promise)
      .mockResolvedValue({ ...snapshot, completedTasks: 7 });
    renderPage();
    act(() => useAuthStore.setState({ userId: 43 }));
    expect(await screen.findByText("7", { exact: true })).toBeTruthy();
    act(() => useAuthStore.setState({ userId: 42 }));
    expect(await screen.findByText("7", { exact: true })).toBeTruthy();
    await act(async () => abandoned.resolve(snapshot));
    expect(screen.queryByText("2", { exact: true })).toBeNull();
  });

  it.each(["account", "guest", "unmount"] as const)("does not save a late AI report after %s transition", async (transition) => {
    const pending = deferred<Awaited<ReturnType<typeof AnalyticsApi.requestInsight>>>();
    vi.mocked(AnalyticsApi.requestInsight).mockReturnValueOnce(pending.promise);
    const view = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" }));
    if (transition === "unmount") view.unmount();
    else act(() => useAuthStore.setState(transition === "guest"
      ? { userId: null, isGuest: true, isAuthenticated: false }
      : { userId: 43 }));
    await act(async () => pending.resolve({ insight: "Синтетический поздний отчёт", cost: 5,
      usage: { limit: 70, remaining: 65, resetAt: "2026-08-29T00:00:00Z" } }));
    expect(screen.queryByText("Синтетический поздний отчёт")).toBeNull();
    expect(Object.keys(localStorage).filter((key) => key.startsWith("glowy-analytics-report"))).toEqual([]);
    if (transition === "guest") {
      expect(screen.getByText("Аналитика сохраняется в аккаунте")).toBeTruthy();
      expect(AnalyticsApi.getSnapshot).toHaveBeenCalledTimes(1);
    }
  });

  it("shows retry, not old metrics, when another period fails", async () => {
    vi.mocked(AnalyticsApi.getSnapshot).mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("synthetic failure"));
    renderPage();
    expect(await screen.findByText("2", { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Месяц" }));
    expect(await screen.findByText("Не удалось загрузить аналитику.")).toBeTruthy();
    expect(screen.queryByText("2", { exact: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeTruthy();
  });

  it.each(["success", "error"] as const)("ignores late retry %s after switching period", async (outcome) => {
    const pending = deferred<typeof snapshot>();
    vi.mocked(AnalyticsApi.getSnapshot).mockRejectedValueOnce(new Error("synthetic failure"))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ ...snapshot, period: { ...snapshot.period, kind: "month" }, completedTasks: 7 });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Повторить" }));
    fireEvent.click(screen.getByRole("button", { name: "Месяц" }));
    expect(await screen.findByText("7", { exact: true })).toBeTruthy();
    await act(async () => {
      if (outcome === "success") pending.resolve(snapshot);
      else pending.reject(new Error("late synthetic failure"));
    });
    expect(screen.getByText("7", { exact: true })).toBeTruthy();
    expect(screen.queryByText("2", { exact: true })).toBeNull();
    expect(screen.queryByText("Не удалось загрузить аналитику.")).toBeNull();
  });

  it("shows pending regeneration, prevents duplicate or delete, and restores controls on failure", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" }));
    expect(await screen.findByRole("heading", { name: "Итог" })).toBeTruthy();
    const pending = deferred<Awaited<ReturnType<typeof AnalyticsApi.requestInsight>>>();
    vi.mocked(AnalyticsApi.requestInsight).mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Новый отчёт" }));
    fireEvent.click(await screen.findByRole("button", { name: "Сделать новый" }));
    expect(screen.getByRole("status").textContent).toContain("Готовлю глубокий разбор");
    const remove = screen.getByRole("button", { name: "Удалить отчёт" }) as HTMLButtonElement;
    const regenerate = screen.getByRole("button", { name: "Новый отчёт" }) as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
    expect(regenerate.disabled).toBe(true);
    fireEvent.click(regenerate);
    fireEvent.click(remove);
    expect(AnalyticsApi.requestInsight).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Итог" })).toBeTruthy();
    await act(async () => pending.reject(new Error("synthetic failure")));
    expect(remove.disabled).toBe(false);
    expect(regenerate.disabled).toBe(false);
    expect(screen.getByRole("heading", { name: "Итог" })).toBeTruthy();
  });

  it.each(["success", "error"] as const)("ignores late AI %s after week → month → week", async (outcome) => {
    const pending = deferred<Awaited<ReturnType<typeof AnalyticsApi.requestInsight>>>();
    vi.mocked(AnalyticsApi.requestInsight).mockReturnValueOnce(pending.promise);
    vi.mocked(AnalyticsApi.getSnapshot).mockImplementation(async (period) => ({
      ...snapshot, period: { ...snapshot.period, kind: period },
    }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" }));
    fireEvent.click(screen.getByRole("button", { name: "Месяц" }));
    expect(await screen.findByRole("button", { name: "Разобрать месяц · 10 запросов" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" })).toBeTruthy();
    await act(async () => {
      if (outcome === "success") pending.resolve({ insight: "Поздний недельный отчёт", cost: 5,
        usage: { limit: 70, remaining: 65, resetAt: "2026-08-29T00:00:00Z" } });
      else pending.reject(new Error("late synthetic failure"));
    });
    expect(screen.queryByText("Поздний недельный отчёт")).toBeNull();
    expect(screen.queryByText("Glowy не смог подготовить вывод. Попробуй позже.")).toBeNull();
    expect(Object.keys(localStorage).filter((key) => key.startsWith("glowy-analytics-report"))).toEqual([]);
  });

  it("retries a failed analytics snapshot without reloading the page", async () => {
    vi.mocked(AnalyticsApi.getSnapshot)
      .mockRejectedValueOnce(new Error("server unavailable"))
      .mockResolvedValue(snapshot);

    renderPage();

    expect(await screen.findByText("Не удалось загрузить аналитику.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByText("2", { exact: true })).toBeTruthy();
    expect(AnalyticsApi.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it("formats, copies, restores and deletes the current owner report", async () => {
    const first = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" }));

    expect(await screen.findByRole("heading", { name: "Итог" })).toBeTruthy();
    expect(screen.getByText("Две", { selector: "strong" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Копировать" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "## Итог\n\n**Две** задачи выполнены."
    ));

    first.unmount();
    renderPage();
    expect(await screen.findByRole("heading", { name: "Итог" })).toBeTruthy();
    expect(AnalyticsApi.requestInsight).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Удалить отчёт" }));
    expect(screen.queryByRole("heading", { name: "Итог" })).toBeNull();
  });

  it("keeps the saved report when regeneration fails", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Разобрать неделю · 5 запросов" }));
    expect(await screen.findByRole("heading", { name: "Итог" })).toBeTruthy();

    vi.mocked(AnalyticsApi.requestInsight).mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Новый отчёт" }));
    fireEvent.click(await screen.findByRole("button", { name: "Сделать новый" }));

    expect(await screen.findByText("Glowy не смог подготовить вывод. Попробуй позже.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Итог" })).toBeTruthy();
  });
});
