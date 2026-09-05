// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressApi } from "../api/ProgressApi";
import { createAppQueryClient } from "../query/queryClient";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";
import type { ProgressOverview } from "../types";
import SuccessStairsPage from "./SuccessStairsPage";

vi.mock("../api/ProgressApi", () => ({
  ProgressApi: {
    getOverview: vi.fn(),
    createHabit: vi.fn(),
    setHabitCompleted: vi.fn(),
    updateHabit: vi.fn(),
    archiveHabit: vi.fn(),
    restoreHabit: vi.fn(),
    deleteHabit: vi.fn(),
    applyRescue: vi.fn(),
  },
}));

vi.mock("../components/onboarding/FirstUsePopover", () => ({
  default: () => null,
}));

vi.mock("../dashboard/SuccessStairs", () => ({
  default: () => <div>Лестница XP</div>,
}));

vi.mock("../components/progress/StreakPanel", () => ({
  default: ({
    isApplyingRescue,
    onUseRescue,
  }: {
    isApplyingRescue: boolean;
    onUseRescue: () => Promise<void>;
  }) => (
    <div>
      Стрик загружен
      <button type="button" onClick={() => void onUseRescue()}>
        {isApplyingRescue ? "Сохраняю круг" : "Открыть спасение"}
      </button>
    </div>
  ),
}));

vi.mock("../components/progress/HabitsPanel", () => ({
  default: () => <div>Привычки загружены</div>,
}));

const overview: ProgressOverview = {
  xp: { current: 120, level: 3, nextLevelAt: 250 },
  taskStreak: {
    current: 2,
    longest: 5,
    lastActiveOn: "2026-08-28",
    days: ["2026-08-27", "2026-08-28"],
    missedDateEligibleForRescue: null,
  },
  rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
  habits: [],
  achievements: [],
  canUseFocusFeatures: true,
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const renderPage = () =>
  render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter>
        <SuccessStairsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isGuest: false, isAuthenticated: true, userId: 1 });
  useTaskStore.setState({ currentXP: 120, userLevel: 3, tasks: [] });
});

afterEach(cleanup);

describe("SuccessStairsPage loading", () => {
  it("stops the loader after an error and retries without reloading the page", async () => {
    vi.mocked(ProgressApi.getOverview)
      .mockRejectedValueOnce(new Error("server unavailable"))
      .mockResolvedValue(overview);

    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Стрик побед" }));

    expect(await screen.findByText(/Не удалось загрузить прогресс/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Прогресс пока недоступен" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Загружаю прогресс" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByText("Стрик загружен")).toBeVisible();
    expect(ProgressApi.getOverview).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("tab", { name: "Привычки" }));
    expect(screen.getByText("Привычки загружены")).toBeVisible();
    await waitFor(() => expect(ProgressApi.getOverview).toHaveBeenCalledTimes(2));
  });

  it("keeps the rescue confirmation pending until the server responds", async () => {
    const request = deferred<ProgressOverview>();
    const eligible = {
      ...overview,
      taskStreak: {
        ...overview.taskStreak,
        missedDateEligibleForRescue: "2026-09-04",
      },
    };
    vi.mocked(ProgressApi.getOverview).mockResolvedValue(eligible);
    vi.mocked(ProgressApi.applyRescue).mockReturnValue(request.promise);
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Стрик побед" }));
    fireEvent.click(await screen.findByRole("button", { name: "Открыть спасение" }));
    fireEvent.click(screen.getByRole("button", { name: "Использовать круг" }));

    expect(await screen.findByRole("button", { name: "Восстанавливаю..." })).toBeDisabled();
    request.resolve({
      ...eligible,
      rescues: { ...eligible.rescues, remaining: 2 },
      taskStreak: {
        ...eligible.taskStreak,
        missedDateEligibleForRescue: null,
      },
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Восстановить стрик?" })
      ).not.toBeInTheDocument()
    );
    expect(ProgressApi.applyRescue).toHaveBeenCalledWith(
      "2026-09-04",
      expect.any(String),
      expect.any(String)
    );
  });
});
