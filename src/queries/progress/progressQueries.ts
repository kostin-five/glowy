import { useQuery } from "@tanstack/react-query";
import { ProgressApi } from "../../api/ProgressApi";
import { accountQueryKeys } from "../../query/accountQueryKeys";

export interface ProgressQueryScope {
  userId: number | null;
  today: string;
  month: string;
  enabled: boolean;
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
}: ProgressQueryScope) =>
  userId === null
    ? progressQueryKeys.anonymousOverview(today, month)
    : progressQueryKeys.overview(userId, today, month);

export const useProgressOverview = (scope: ProgressQueryScope) =>
  useQuery({
    queryKey: getProgressOverviewKey(scope),
    queryFn: ({ signal }) => {
      if (scope.userId === null) {
        throw new Error("Progress query requires an authenticated account");
      }
      return ProgressApi.getOverview(scope.today, scope.month, signal);
    },
    enabled: scope.enabled && scope.userId !== null,
  });
