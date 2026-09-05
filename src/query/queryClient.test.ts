import type { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";
import {
  SERVER_STATE_GC_TIME,
  SERVER_STATE_STALE_TIME,
  createAppQueryClient,
} from "./queryClient";

const axiosError = (status?: number) =>
  Object.assign(new Error("request failed"), {
    isAxiosError: true,
    response: status === undefined ? undefined : { status },
  }) as AxiosError;

describe("createAppQueryClient", () => {
  it("retries a temporary query failure once", async () => {
    const client = createAppQueryClient();
    const queryFn = vi.fn().mockRejectedValue(axiosError(503));

    await expect(
      client.fetchQuery({ queryKey: ["temporary"], queryFn, retryDelay: 0 })
    ).rejects.toThrow("request failed");

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors or mutations", async () => {
    const client = createAppQueryClient();
    const queryFn = vi.fn().mockRejectedValue(axiosError(404));

    await expect(
      client.fetchQuery({ queryKey: ["client-error"], queryFn, retryDelay: 0 })
    ).rejects.toThrow("request failed");

    expect(queryFn).toHaveBeenCalledOnce();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("uses a short non-persistent freshness policy", () => {
    const queries = createAppQueryClient().getDefaultOptions().queries;

    expect(queries?.staleTime).toBe(SERVER_STATE_STALE_TIME);
    expect(queries?.gcTime).toBe(SERVER_STATE_GC_TIME);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });
});
