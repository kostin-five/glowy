// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const post = vi.fn();
const axiosInstance = {
  get,
  post,
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock("axios", () => ({
  default: {
    create: () => axiosInstance,
    isAxiosError: () => false,
  },
}));

const { ProgressApi } = await import("./ProgressApi");

const overview = {
  xp: { current: 10, level: 1, nextLevelAt: 100 },
  taskStreak: {
    current: 1,
    longest: 1,
    lastActiveOn: "2026-08-28",
    days: ["2026-08-28"],
    missedDateEligibleForRescue: null,
    calendar: {
      month: "2026-08",
      from: "2026-07-27",
      to: "2026-09-06",
      canGoPrevious: true,
      canGoNext: false,
      days: Array.from({ length: 42 }, (_, index) => {
        const date = new Date(Date.UTC(2026, 6, 27 + index));
        const value = date.toISOString().slice(0, 10);
        return {
          date: value,
          inMonth: value.startsWith("2026-08"),
          state: index === 32 ? "active" as const : "missed" as const,
        };
      }),
    },
  },
  rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
  habits: [],
  achievements: [],
  canUseFocusFeatures: false,
};

afterEach(() => {
  get.mockReset();
  post.mockReset();
});

describe("ProgressApi calendar contract", () => {
  it("sends the selected month and parses the additive calendar", async () => {
    get.mockResolvedValue({ data: overview });

    const result = await ProgressApi.getOverview("2026-08-28", "2026-08");

    expect(get).toHaveBeenCalledWith("", {
      params: { today: "2026-08-28", month: "2026-08" },
      signal: undefined,
    });
    expect(result.taskStreak.calendar?.month).toBe("2026-08");
  });

  it("forwards an abort signal while preserving response validation", async () => {
    get.mockResolvedValue({ data: overview });
    const controller = new AbortController();

    const result = await ProgressApi.getOverview(
      "2026-08-28",
      "2026-08",
      controller.signal
    );

    expect(get).toHaveBeenCalledWith("", {
      params: { today: "2026-08-28", month: "2026-08" },
      signal: controller.signal,
    });
    expect(result.xp.current).toBe(10);
  });

  it("keeps the month in an explicit rescue request", async () => {
    post.mockResolvedValue({ data: overview });

    await ProgressApi.applyRescue("2026-08-27", "2026-08-28", "2026-08");

    expect(post).toHaveBeenCalledWith("/rescues", {
      protectedOn: "2026-08-27",
      today: "2026-08-28",
      month: "2026-08",
    });
  });
});
