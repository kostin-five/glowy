// @vitest-environment jsdom

import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressApi } from "../../api/ProgressApi";
import { createAppQueryClient } from "../../query/queryClient";
import type { Habit, ProgressOverview } from "../../types";
import { useProgressMutations } from "./progressMutations";
import {
  getProgressOverviewKey,
  type ProgressQueryScope,
} from "./progressQueries";

vi.mock("../../api/ProgressApi", () => ({
  ProgressApi: {
    createHabit: vi.fn(),
    setHabitCompleted: vi.fn(),
    updateHabit: vi.fn(),
    archiveHabit: vi.fn(),
    restoreHabit: vi.fn(),
    deleteHabit: vi.fn(),
    applyRescue: vi.fn(),
  },
}));

const habit = (id: number, overrides: Partial<Habit> = {}): Habit => ({
  id,
  title: `Привычка ${id}`,
  archived: false,
  checkedToday: false,
  checkDates: [],
  currentStreak: 0,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
  ...overrides,
});

const firstHabit = habit(1);
const secondHabit = habit(2);
const overview: ProgressOverview = {
  xp: { current: 10, level: 1, nextLevelAt: 100 },
  taskStreak: {
    current: 1,
    longest: 1,
    lastActiveOn: "2026-09-05",
    days: ["2026-09-05"],
    missedDateEligibleForRescue: "2026-09-04",
  },
  rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
  habits: [firstHabit, secondHabit],
  achievements: [],
  canUseFocusFeatures: false,
};
const scope: ProgressQueryScope = {
  userId: 7,
  today: "2026-09-05",
  month: "2026-09",
  enabled: true,
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const readOverview = (
  client: ReturnType<typeof createAppQueryClient>
) => client.getQueryData<ProgressOverview>(getProgressOverviewKey(scope));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("useProgressMutations", () => {
  it("optimistically creates a habit and reconciles the server id", async () => {
    const request = deferred<Habit>();
    vi.mocked(ProgressApi.createHabit).mockReturnValue(request.promise);
    const client = createAppQueryClient();
    client.setQueryData(getProgressOverviewKey(scope), overview);
    const { result } = renderHook(() => useProgressMutations(scope), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    let mutation!: Promise<Habit>;
    act(() => {
      mutation = result.current.createHabit.mutateAsync({ title: "Новая" });
    });
    await waitFor(() =>
      expect(readOverview(client)?.habits.some((item) => item.id < 0)).toBe(true)
    );

    const saved = habit(10, { title: "Новая" });
    request.resolve(saved);
    await act(async () => mutation);

    expect(readOverview(client)?.habits).toContainEqual(saved);
    expect(readOverview(client)?.habits.some((item) => item.id < 0)).toBe(false);
  });

  it("rolls back every failed habit mutation", async () => {
    const error = new Error("offline");
    vi.mocked(ProgressApi.createHabit).mockRejectedValue(error);
    vi.mocked(ProgressApi.setHabitCompleted).mockRejectedValue(error);
    vi.mocked(ProgressApi.updateHabit).mockRejectedValue(error);
    vi.mocked(ProgressApi.archiveHabit).mockRejectedValue(error);
    vi.mocked(ProgressApi.restoreHabit).mockRejectedValue(error);
    vi.mocked(ProgressApi.deleteHabit).mockRejectedValue(error);
    const client = createAppQueryClient();
    const key = getProgressOverviewKey(scope);
    const { result } = renderHook(() => useProgressMutations(scope), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    const reset = () => client.setQueryData(key, overview);
    const expectRollback = () => expect(readOverview(client)).toEqual(overview);

    reset();
    await act(async () => {
      await result.current.createHabit.mutateAsync({ title: "Новая" }).catch(() => undefined);
    });
    expectRollback();

    reset();
    await act(async () => {
      await result.current.toggleHabit
        .mutateAsync({ habit: firstHabit, date: scope.today })
        .catch(() => undefined);
    });
    expectRollback();

    reset();
    await act(async () => {
      await result.current.renameHabit
        .mutateAsync({ habit: firstHabit, title: "Новое имя" })
        .catch(() => undefined);
    });
    expectRollback();

    reset();
    await act(async () => {
      await result.current.archiveHabit
        .mutateAsync({ habit: firstHabit })
        .catch(() => undefined);
    });
    expectRollback();

    const archived = habit(1, { archived: true });
    const archivedOverview = { ...overview, habits: [archived, secondHabit] };
    client.setQueryData(key, archivedOverview);
    await act(async () => {
      await result.current.restoreHabit
        .mutateAsync({ habit: archived })
        .catch(() => undefined);
    });
    expect(readOverview(client)).toEqual(archivedOverview);

    reset();
    await act(async () => {
      await result.current.deleteHabit
        .mutateAsync({ habit: firstHabit })
        .catch(() => undefined);
    });
    expectRollback();
  });

  it("tracks pending ids independently for concurrent habit mutations", async () => {
    const archive = deferred<Habit>();
    const rename = deferred<Habit>();
    vi.mocked(ProgressApi.archiveHabit).mockReturnValue(archive.promise);
    vi.mocked(ProgressApi.updateHabit).mockReturnValue(rename.promise);
    const client = createAppQueryClient();
    client.setQueryData(getProgressOverviewKey(scope), overview);
    const { result } = renderHook(() => useProgressMutations(scope), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    let archiveMutation!: Promise<Habit>;
    let renameMutation!: Promise<Habit>;
    act(() => {
      archiveMutation = result.current.archiveHabit.mutateAsync({ habit: firstHabit });
      renameMutation = result.current.renameHabit.mutateAsync({
        habit: secondHabit,
        title: "Другая",
      });
    });

    await waitFor(() => expect(result.current.pendingHabitIds).toEqual(new Set([1, 2])));
    archive.resolve({ ...firstHabit, archived: true });
    rename.resolve({ ...secondHabit, title: "Другая" });
    await act(async () => Promise.all([archiveMutation, renameMutation]));
    await waitFor(() => expect(result.current.pendingHabitIds.size).toBe(0));
  });

  it("reconciles rescue only into the current overview key", async () => {
    const rescued = {
      ...overview,
      rescues: { ...overview.rescues, remaining: 2 },
    };
    vi.mocked(ProgressApi.applyRescue).mockResolvedValue(rescued);
    const client = createAppQueryClient();
    const key = getProgressOverviewKey(scope);
    const otherKey = getProgressOverviewKey({ ...scope, userId: 8 });
    client.setQueryData(key, overview);
    client.setQueryData(otherKey, overview);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useProgressMutations(scope), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await act(async () =>
      result.current.applyRescue.mutateAsync({ protectedOn: "2026-09-04" })
    );

    expect(readOverview(client)).toEqual(rescued);
    expect(client.getQueryData(otherKey)).toEqual(overview);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key, exact: true });
  });

  it("keeps the previous overview when rescue fails", async () => {
    vi.mocked(ProgressApi.applyRescue).mockRejectedValue(new Error("offline"));
    const client = createAppQueryClient();
    client.setQueryData(getProgressOverviewKey(scope), overview);
    const { result } = renderHook(() => useProgressMutations(scope), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await act(async () => {
      await result.current.applyRescue
        .mutateAsync({ protectedOn: "2026-09-04" })
        .catch(() => undefined);
    });

    expect(readOverview(client)).toEqual(overview);
  });
});
