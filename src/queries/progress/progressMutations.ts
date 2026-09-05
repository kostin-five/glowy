import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ProgressApi } from "../../api/ProgressApi";
import { accountQueryKeys } from "../../query/accountQueryKeys";
import type { Habit, ProgressOverview } from "../../types";
import {
  getProgressOverviewKey,
  type ProgressQueryScope,
} from "./progressQueries";

interface HabitVariable {
  habit: Habit;
}

interface RenameHabitVariable extends HabitVariable {
  title: string;
}

interface ToggleHabitVariable extends HabitVariable {
  date: string;
}

interface CreateHabitVariable {
  title: string;
}

interface RescueVariable {
  protectedOn: string;
}

let optimisticHabitId = -1;

const replaceHabit = (overview: ProgressOverview, habit: Habit) => ({
  ...overview,
  habits: overview.habits.map((item) => (item.id === habit.id ? habit : item)),
});

const mutationRoot = (userId: number | null) =>
  userId === null
    ? (["account", "anonymous", "progress", "mutation"] as const)
    : ([...accountQueryKeys.root(userId), "progress", "mutation"] as const);

export const progressMutationKeys = {
  habits: (userId: number | null) => [...mutationRoot(userId), "habit"] as const,
  habit: (userId: number | null, action: string) =>
    [...mutationRoot(userId), "habit", action] as const,
  rescue: (userId: number | null) => [...mutationRoot(userId), "rescue"] as const,
};

export const useProgressMutations = (scope: ProgressQueryScope) => {
  const queryClient = useQueryClient();
  const overviewKey = getProgressOverviewKey(scope);

  const ensureAccount = () => {
    if (scope.userId === null || !scope.enabled) {
      throw new Error("Progress mutation requires an authenticated account");
    }
  };

  const cancelOverview = async () => {
    await queryClient.cancelQueries({ queryKey: overviewKey, exact: true });
  };

  const invalidateOverview = async () => {
    await queryClient.invalidateQueries({ queryKey: overviewKey, exact: true });
  };

  const createHabit = useMutation({
    mutationKey: progressMutationKeys.habit(scope.userId, "create"),
    mutationFn: ({ title }: CreateHabitVariable) => {
      ensureAccount();
      return ProgressApi.createHabit(title, scope.today);
    },
    onMutate: async ({ title }) => {
      await cancelOverview();
      const temporaryId = optimisticHabitId--;
      const timestamp = new Date().toISOString();
      const optimisticHabit: Habit = {
        id: temporaryId,
        title,
        archived: false,
        checkedToday: false,
        checkDates: [],
        currentStreak: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current ? { ...current, habits: [...current.habits, optimisticHabit] } : current
      );
      return { temporaryId };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current
          ? {
              ...current,
              habits: current.habits.filter((habit) => habit.id !== context?.temporaryId),
            }
          : current
      );
    },
    onSuccess: (habit, _variables, context) => {
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current
          ? {
              ...current,
              habits: current.habits.map((item) =>
                item.id === context?.temporaryId ? habit : item
              ),
            }
          : current
      );
    },
    onSettled: invalidateOverview,
  });

  const toggleHabit = useMutation({
    mutationKey: progressMutationKeys.habit(scope.userId, "toggle"),
    mutationFn: ({ habit, date }: ToggleHabitVariable) => {
      ensureAccount();
      const completed = habit.checkDates.includes(date);
      return ProgressApi.setHabitCompleted(
        habit.id,
        date,
        !completed,
        scope.today
      );
    },
    onMutate: async ({ habit, date }) => {
      await cancelOverview();
      const completed = habit.checkDates.includes(date);
      const checkDates = completed
        ? habit.checkDates.filter((item) => item !== date)
        : [...habit.checkDates, date].sort();
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current
          ? replaceHabit(current, {
              ...habit,
              checkDates,
              checkedToday:
                date === scope.today ? !completed : habit.checkedToday,
            })
          : current
      );
      return { previousHabit: habit };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previousHabit) return;
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current ? replaceHabit(current, context.previousHabit) : current
      );
    },
    onSuccess: (habit) => {
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current ? replaceHabit(current, habit) : current
      );
    },
    onSettled: invalidateOverview,
  });

  const useHabitPatchMutation = (
    action: "rename" | "archive" | "restore",
    mutationFn: (variables: RenameHabitVariable | HabitVariable) => Promise<Habit>,
    optimisticHabit: (variables: RenameHabitVariable | HabitVariable) => Habit
  ) =>
    useMutation({
      mutationKey: progressMutationKeys.habit(scope.userId, action),
      mutationFn: (variables: RenameHabitVariable | HabitVariable) => {
        ensureAccount();
        return mutationFn(variables);
      },
      onMutate: async (variables) => {
        await cancelOverview();
        queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
          current ? replaceHabit(current, optimisticHabit(variables)) : current
        );
        return { previousHabit: variables.habit };
      },
      onError: (_error, _variables, context) => {
        if (!context?.previousHabit) return;
        queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
          current ? replaceHabit(current, context.previousHabit) : current
        );
      },
      onSuccess: (habit) => {
        queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
          current ? replaceHabit(current, habit) : current
        );
      },
      onSettled: invalidateOverview,
    });

  const renameHabit = useHabitPatchMutation(
    "rename",
    (variables) => {
      const { habit, title } = variables as RenameHabitVariable;
      return ProgressApi.updateHabit(habit.id, title, scope.today);
    },
    (variables) => {
      const { habit, title } = variables as RenameHabitVariable;
      return { ...habit, title };
    }
  );
  const archiveHabit = useHabitPatchMutation(
    "archive",
    ({ habit }) => ProgressApi.archiveHabit(habit.id, scope.today),
    ({ habit }) => ({ ...habit, archived: true })
  );
  const restoreHabit = useHabitPatchMutation(
    "restore",
    ({ habit }) => ProgressApi.restoreHabit(habit.id, scope.today),
    ({ habit }) => ({ ...habit, archived: false })
  );

  const deleteHabit = useMutation({
    mutationKey: progressMutationKeys.habit(scope.userId, "delete"),
    mutationFn: async ({ habit }: HabitVariable) => {
      ensureAccount();
      await ProgressApi.deleteHabit(habit.id);
    },
    onMutate: async ({ habit }) => {
      await cancelOverview();
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) =>
        current
          ? {
              ...current,
              habits: current.habits.filter((item) => item.id !== habit.id),
            }
          : current
      );
      return { previousHabit: habit };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previousHabit) return;
      queryClient.setQueryData<ProgressOverview>(overviewKey, (current) => {
        if (!current || current.habits.some((habit) => habit.id === context.previousHabit.id)) {
          return current;
        }
        return {
          ...current,
          habits: [...current.habits, context.previousHabit].sort((left, right) => left.id - right.id),
        };
      });
    },
    onSettled: invalidateOverview,
  });

  const applyRescue = useMutation({
    mutationKey: progressMutationKeys.rescue(scope.userId),
    mutationFn: ({ protectedOn }: RescueVariable) => {
      ensureAccount();
      return ProgressApi.applyRescue(
        protectedOn,
        scope.today,
        scope.month
      );
    },
    onMutate: async () => {
      await cancelOverview();
      return { previous: queryClient.getQueryData<ProgressOverview>(overviewKey) };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(overviewKey, context.previous);
    },
    onSuccess: (overview) => queryClient.setQueryData(overviewKey, overview),
    onSettled: invalidateOverview,
  });

  const pendingHabitIds = useMutationState({
    filters: {
      mutationKey: progressMutationKeys.habits(scope.userId),
      status: "pending",
    },
    select: (mutation) =>
      (mutation.state.variables as HabitVariable | undefined)?.habit?.id,
  });

  return {
    createHabit,
    toggleHabit,
    renameHabit,
    archiveHabit,
    restoreHabit,
    deleteHabit,
    applyRescue,
    pendingHabitIds: useMemo(
      () => new Set(pendingHabitIds.filter((id): id is number => id !== undefined)),
      [pendingHabitIds]
    ),
  };
};
