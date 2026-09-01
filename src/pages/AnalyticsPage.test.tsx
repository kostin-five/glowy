// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
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
