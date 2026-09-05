import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const SERVER_STATE_STALE_TIME = 30_000;
export const SERVER_STATE_GC_TIME = 5 * 60_000;

export const shouldRetryQuery = (failureCount: number, error: unknown) => {
  if (failureCount >= 1 || !axios.isAxiosError(error)) return false;
  return !error.response || error.response.status >= 500;
};

export const createAppQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: SERVER_STATE_STALE_TIME,
        gcTime: SERVER_STATE_GC_TIME,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const appQueryClient = createAppQueryClient();
