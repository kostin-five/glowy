// @vitest-environment jsdom

import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../store/useAuthStore";
import { accountQueryKeys } from "./accountQueryKeys";
import { QuerySessionBoundary } from "./AppQueryProvider";
import { createAppQueryClient } from "./queryClient";

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    isGuest: false,
    userId: 1,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("QuerySessionBoundary", () => {
  it("cancels and removes queries from the previous account", async () => {
    const client = createAppQueryClient();
    const abort = vi.fn();
    void client
      .fetchQuery({
        queryKey: [...accountQueryKeys.root(1), "progress"],
        queryFn: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              abort();
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
        retry: false,
      })
      .catch(() => undefined);

    render(
      <QueryClientProvider client={client}>
        <QuerySessionBoundary>
          <span>content</span>
        </QuerySessionBoundary>
      </QueryClientProvider>
    );

    await act(async () => undefined);
    act(() => useAuthStore.setState({ userId: 2 }));

    await waitFor(() => expect(abort).toHaveBeenCalledOnce());
    expect(client.getQueriesData({ queryKey: accountQueryKeys.root(1) })).toEqual([]);
  });

  it("removes account data on logout", async () => {
    const client = createAppQueryClient();
    client.setQueryData([...accountQueryKeys.root(1), "progress"], "private");

    render(
      <QueryClientProvider client={client}>
        <QuerySessionBoundary>
          <span>content</span>
        </QuerySessionBoundary>
      </QueryClientProvider>
    );

    await act(async () => undefined);
    act(() =>
      useAuthStore.setState({
        isAuthenticated: false,
        userId: null,
      })
    );

    await waitFor(() =>
      expect(client.getQueriesData({ queryKey: accountQueryKeys.root(1) })).toEqual([])
    );
  });
});
