// @vitest-environment jsdom

import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressApi } from "../../api/ProgressApi";
import { createAppQueryClient } from "../../query/queryClient";
import type { ProgressOverview } from "../../types";
import {
  progressQueryKeys,
  useProgressOverview,
  type ProgressQueryScope,
} from "./progressQueries";

vi.mock("../../api/ProgressApi", () => ({
  ProgressApi: { getOverview: vi.fn() },
}));

const overview: ProgressOverview = {
  xp: { current: 10, level: 1, nextLevelAt: 100 },
  taskStreak: {
    current: 1,
    longest: 1,
    lastActiveOn: "2026-09-05",
    days: ["2026-09-05"],
    missedDateEligibleForRescue: null,
  },
  rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
  habits: [],
  achievements: [],
  canUseFocusFeatures: false,
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const scope: ProgressQueryScope = {
  userId: 7,
  today: "2026-09-05",
  month: "2026-09",
  enabled: true,
};

describe("progress queries", () => {
  it("separates overview keys by account and parameters", () => {
    expect(progressQueryKeys.overview(1, "2026-09-05", "2026-09")).not.toEqual(
      progressQueryKeys.overview(2, "2026-09-05", "2026-09")
    );
    expect(progressQueryKeys.overview(1, "2026-09-05", "2026-09")).not.toEqual(
      progressQueryKeys.overview(1, "2026-09-05", "2026-08")
    );
  });

  it("does not call the API without an authenticated account", () => {
    const client = createAppQueryClient();
    renderHook(
      () => useProgressOverview({ ...scope, userId: null, enabled: false }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      }
    );

    expect(ProgressApi.getOverview).not.toHaveBeenCalled();
  });

  it("reuses a fresh overview without another request", async () => {
    vi.mocked(ProgressApi.getOverview).mockResolvedValue(overview);
    const client = createAppQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useProgressOverview(scope), { wrapper });
    await waitFor(() => expect(first.result.current.data).toEqual(overview));
    first.unmount();
    const second = renderHook(() => useProgressOverview(scope), { wrapper });
    await waitFor(() => expect(second.result.current.data).toEqual(overview));

    expect(ProgressApi.getOverview).toHaveBeenCalledOnce();
  });

  it("does not apply a late response from a previous month", async () => {
    const august = deferred<ProgressOverview>();
    const september = deferred<ProgressOverview>();
    vi.mocked(ProgressApi.getOverview)
      .mockReturnValueOnce(august.promise)
      .mockReturnValueOnce(september.promise);
    const client = createAppQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ month }) => useProgressOverview({ ...scope, month }),
      { initialProps: { month: "2026-08" }, wrapper }
    );

    rerender({ month: "2026-09" });
    august.resolve({ ...overview, xp: { ...overview.xp, current: 8 } });
    september.resolve({ ...overview, xp: { ...overview.xp, current: 9 } });

    await waitFor(() => expect(result.current.data?.xp.current).toBe(9));
    expect(ProgressApi.getOverview).toHaveBeenCalledTimes(2);
  });
});
