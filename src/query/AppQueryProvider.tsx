import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { accountQueryKeys } from "./accountQueryKeys";
import { appQueryClient } from "./queryClient";

export const QuerySessionBoundary = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) =>
    state.isAuthenticated && !state.isGuest ? state.userId : null
  );
  const previousUserId = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    const previous = previousUserId.current;
    previousUserId.current = userId;

    if (previous === undefined || previous === null || previous === userId) {
      return;
    }

    const queryKey = accountQueryKeys.root(previous);
    void queryClient.cancelQueries({ queryKey });
    queryClient.removeQueries({ queryKey });
  }, [queryClient, userId]);

  return children;
};

export const AppQueryProvider = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={appQueryClient}>
    <QuerySessionBoundary>{children}</QuerySessionBoundary>
  </QueryClientProvider>
);
