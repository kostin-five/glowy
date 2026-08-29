import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();

vi.mock("axios", () => ({
  default: {
    create: () => ({
      get,
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
  },
}));

vi.mock("./unauthorizedInterceptor", () => ({
  attachUnauthorizedInterceptor: vi.fn(),
}));

describe("AnalyticsApi", () => {
  beforeEach(() => {
    vi.resetModules();
    get.mockReset();
  });

  it("loads a private snapshot without a trailing slash", async () => {
    get.mockResolvedValue({
      data: {
        period: { kind: "week", from: "2026-08-24", to: "2026-08-30" },
        completedTasks: 0,
        dailyCompleted: [],
        energyDistribution: { low: 0, med: 0, high: 0 },
        taskStreak: 0,
        time: {
          estimatedMinutes: 0,
          actualMinutes: 0,
          tasksWithEstimate: 0,
          tasksWithActual: 0,
        },
        hasActivity: false,
        canUseFocusFeatures: false,
        focusBetaAvailable: false,
        focusBetaEnabled: false,
        canRequestAiInsight: false,
      },
    });

    const { AnalyticsApi } = await import("./AnalyticsApi");
    await AnalyticsApi.getSnapshot("week", "2026-08-29");

    expect(get).toHaveBeenCalledWith("", {
      params: {
        period: "week",
        anchor: "2026-08-29",
      },
    });
  });
});
