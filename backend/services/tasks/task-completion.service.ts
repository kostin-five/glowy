import { prisma } from "../../lib/prisma.js";
import type { Prisma, PrismaClient, Task } from "@prisma/client";

const LEVEL_THRESHOLDS = [
  0, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 9000, 10000,
];

const getLevelThreshold = (level: number): number =>
  level <= LEVEL_THRESHOLDS.length
    ? (LEVEL_THRESHOLDS[level - 1] ?? 0)
    : (LEVEL_THRESHOLDS.at(-1) ?? 0) + (level - 14) * 2500;

export const getLevelByXp = (xp: number): number => {
  let level = 1;
  while (xp >= getLevelThreshold(level + 1)) level += 1;
  return level;
};

export const getXpReward = (energyLevel = "low", priority = ""): number => {
  const baseReward = { high: 30, med: 20, low: 10 }[energyLevel] ?? 10;
  const multiplier = priority.includes("P1")
    ? 1.5
    : priority.includes("P2")
      ? 1.2
      : 1;
  return Math.round(baseReward * multiplier);
};

export const buildUserProgress = (user: { xp: number; level: number }) => ({
  xp: user.xp,
  level: user.level,
});

export const isTaskOverdueOn = (
  task: Pick<Task, "completed" | "date"> | null | undefined,
  referenceDay: string
): boolean =>
  Boolean(
    task?.completed !== true &&
      typeof task?.date === "string" &&
      task.date.length > 0 &&
      task.date < referenceDay
  );

export const buildCompletionXpOutcome = ({
  aiTone = "calm",
  reward,
  currentXp,
  hasOverdueBlocker = false,
  targetIsOverdue = false,
}: {
  aiTone?: string | null;
  reward: number;
  currentXp: number;
  hasOverdueBlocker?: boolean;
  targetIsOverdue?: boolean;
}) => {
  if (!hasOverdueBlocker || targetIsOverdue || aiTone === "calm") {
    return {
      effect: "awarded",
      amount: reward,
      reason: "normal",
      xpDelta: reward,
    };
  }

  if (aiTone === "strict") {
    const amount = Math.min(reward, Math.max(0, currentXp));
    return {
      effect: "deducted",
      amount,
      reason: "overdue_blocker",
      xpDelta: -amount,
    };
  }

  return {
    effect: "withheld",
    amount: 0,
    reason: "overdue_blocker",
    xpDelta: 0,
  };
};

export const hasActiveOverdueTask = async ({
  db,
  userId,
  excludeTaskId,
  referenceDay,
}: {
  db: PrismaClient | Prisma.TransactionClient;
  userId: number;
  excludeTaskId: number;
  referenceDay: string;
}): Promise<boolean> => Boolean(await db.task.findFirst({
  where: {
    userId,
    id: { not: excludeTaskId },
    completed: false,
    date: { not: "", lt: referenceDay },
  },
  select: { id: true },
}));

export const completeTaskForUser = async ({
  db = prisma,
  userId,
  taskId,
  completedOn,
}: {
  db?: PrismaClient;
  userId: number;
  taskId: number;
  completedOn: string;
}) => db.$transaction(async (tx) => {
  const task = await tx.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) return { state: "INVALID" };
  if (task.completed) return { state: "ALREADY_COMPLETED", task };

  const claimed = await tx.task.updateMany({
    where: { id: taskId, userId, completed: false },
    data: {
      completed: true,
      completedOn,
      xpAwarded: true,
    },
  });
  if (claimed.count !== 1) return { state: "ALREADY_COMPLETED" };

  let xpReward = 0;
  let xpOutcome = null;
  let userProgress = null;
  if (!task.xpAwarded) {
    const reward = getXpReward(task.energyLevel, task.priority);
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, aiTone: true },
    });
    const targetIsOverdue = isTaskOverdueOn(task, completedOn);
    const hasOverdueBlocker = targetIsOverdue
      ? false
      : await hasActiveOverdueTask({
          db: tx,
          userId,
          excludeTaskId: taskId,
          referenceDay: completedOn,
        });
    xpOutcome = buildCompletionXpOutcome({
      aiTone: user?.aiTone,
      reward,
      currentXp: user?.xp ?? 0,
      hasOverdueBlocker,
      targetIsOverdue,
    });
    xpReward = xpOutcome.xpDelta;
    const nextXp = Math.max(0, (user?.xp ?? 0) + xpReward);
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { xp: nextXp, level: getLevelByXp(nextXp) },
      select: { xp: true, level: true },
    });
    userProgress = buildUserProgress(updatedUser);
  }
  return {
    state: "COMPLETED",
    task: { ...task, completed: true, completedOn, xpAwarded: true },
    xpReward,
    xpOutcome,
    userProgress,
  };
});
