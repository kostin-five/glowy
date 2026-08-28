// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProgressOverview } from "../../types";
import StreakPanel from "./StreakPanel";

afterEach(cleanup);

const progress: ProgressOverview = {
  xp: { current: 120, level: 3, nextLevelAt: 250 },
  taskStreak: {
    current: 2,
    longest: 5,
    lastActiveOn: "2026-08-28",
    days: ["2026-08-27", "2026-08-28"],
    missedDateEligibleForRescue: "2026-08-27",
    calendar: {
      month: "2026-08",
      from: "2026-07-27",
      to: "2026-09-06",
      canGoPrevious: true,
      canGoNext: false,
      days: Array.from({ length: 42 }, (_, index) => ({
        date: `2026-08-${String(Math.min(index + 1, 31)).padStart(2, "0")}`,
        inMonth: true,
        state: index === 0 ? "active" as const : index === 1 ? "rescued" as const : "missed" as const,
      })),
    },
  },
  rescues: { remaining: 2, monthlyLimit: 3, usedDates: [] },
  habits: [],
  achievements: [],
  canUseFocusFeatures: true,
};

describe("StreakPanel rhythm calendar", () => {
  it("renders seven columns, legend and bounded month navigation", () => {
    const onMonthChange = vi.fn();
    render(
      <StreakPanel
        progress={progress}
        isApplyingRescue={false}
        onUseRescue={vi.fn()}
        onMonthChange={onMonthChange}
      />
    );

    expect(screen.getByLabelText("Календарь ритма").children).toHaveLength(42);
    expect(screen.getByLabelText("Обозначения календаря")).toHaveTextContent("Спасено");
    expect(screen.getByRole("button", { name: "Следующий месяц" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Предыдущий месяц" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-07");
  });

  it("offers rescue only for yesterday through an explicit action", () => {
    const onUseRescue = vi.fn();
    render(
      <StreakPanel
        progress={progress}
        isApplyingRescue={false}
        onUseRescue={onUseRescue}
        onMonthChange={vi.fn()}
      />
    );

    expect(screen.getByText(/спасти только вчерашний день/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Использовать круг" }));
    expect(onUseRescue).toHaveBeenCalledOnce();
  });
});
