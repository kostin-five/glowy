import { prisma } from "../../lib/prisma.js";

const LEVEL_THRESHOLDS = [
  0, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 9000, 10000,
];

const getLevelThreshold = (level) =>
  level <= LEVEL_THRESHOLDS.length
    ? LEVEL_THRESHOLDS[level - 1]
    : LEVEL_THRESHOLDS.at(-1) + (level - 14) * 2500;

export const getLevelByXp = (xp) => {
  let level = 1;
  while (xp >= getLevelThreshold(level + 1)) level += 1;
  return level;
};

export const getXpReward = (energyLevel = "low", priority = "") => {
  const baseReward = { high: 30, med: 20, low: 10 }[energyLevel] ?? 10;
  const multiplier = priority.includes("P1")
    ? 1.5
    : priority.includes("P2")
      ? 1.2
      : 1;
  return Math.round(baseReward * multiplier);
};

export const buildUserProgress = (user) => ({ xp: user.xp, level: user.level });

export const completeTaskForUser = async ({
  db = prisma,
  userId,
  taskId,
  completedOn,
} = {}) => db.$transaction(async (tx) => {
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
  if (!task.xpAwarded) {
    xpReward = getXpReward(task.energyLevel, task.priority);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { xp: true } });
    const nextXp = (user?.xp ?? 0) + xpReward;
    await tx.user.update({
      where: { id: userId },
      data: { xp: nextXp, level: getLevelByXp(nextXp) },
    });
  }
  return { state: "COMPLETED", task: { ...task, completed: true, completedOn }, xpReward };
});
