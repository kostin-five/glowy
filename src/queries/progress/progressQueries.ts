import { useQuery } from "@tanstack/react-query";
import { ProgressApi } from "../../api/ProgressApi";
import { accountQueryKeys } from "../../query/accountQueryKeys";
import { useAuthStore } from "../../store/useAuthStore";

export interface ProgressQueryScope {
  userId: number | null;
  today: string;
  month: string;
  enabled: boolean;
  isGuest?: boolean;
  taskRevision?: string;
  sessionKey?: string;
}

const anonymousAccountKey = ["account", "anonymous"] as const;

export const progressQueryKeys = {
  account: (userId: number) => [...accountQueryKeys.root(userId), "progress"] as const,
  overview: (userId: number, today: string, month: string) =>
    [...accountQueryKeys.root(userId), "progress", "overview", today, month] as const,
  anonymousOverview: (today: string, month: string) =>
    [...anonymousAccountKey, "progress", "overview", today, month] as const,
};

export const getProgressOverviewKey = ({
  userId,
  today,
  month,
  isGuest,
  taskRevision,
  sessionKey,
}: ProgressQueryScope) =>
  isGuest ? ["demo", "progress", sessionKey, today, month, taskRevision] as const : userId === null
    ? progressQueryKeys.anonymousOverview(today, month)
    : progressQueryKeys.overview(userId, today, month);

export const useProgressOverview = (scope: ProgressQueryScope) =>
  useQuery({
    queryKey: getProgressOverviewKey(scope),
    networkMode: scope.isGuest ? "always" : "online",
    queryFn: ({ signal }) => {
      const auth = useAuthStore.getState();
      if (scope.isGuest ? !auth.isGuest || (scope.sessionKey !== undefined && scope.sessionKey !== (auth.token ?? "guest")) : auth.isGuest || scope.userId === null) {
        throw new Error("Progress query requires an authenticated account");
      }
      return ProgressApi.getOverview(scope.today, scope.month, signal);
    },
    enabled: scope.enabled && (scope.isGuest || scope.userId !== null),
  });
