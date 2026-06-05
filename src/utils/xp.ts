export const LEVEL_THRESHOLDS = [
  0, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 9000, 10000,
];

export const getLevelThreshold = (level: number) => {
  if (level <= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[Math.max(0, level - 1)];
  }

  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - 14) * 2500;
};

export const getLevelByXp = (xp: number) => {
  let level = 1;

  while (xp >= getLevelThreshold(level + 1)) {
    level += 1;
  }

  return level;
};

export const getXpReward = (energyLevel = "low", priority = "") => {
  const baseRewardByEnergy: Record<string, number> = {
    high: 30,
    med: 20,
    low: 10,
  };
  const priorityMultiplier = priority.includes("P1")
    ? 1.5
    : priority.includes("P2")
    ? 1.2
    : 1;
  const baseReward = baseRewardByEnergy[energyLevel] ?? baseRewardByEnergy.low;

  return Math.round(baseReward * priorityMultiplier);
};

export const getLevelProgress = (currentXP: number, currentLevel: number) => {
  const levelStartXP = getLevelThreshold(currentLevel);
  const nextLevelXP = getLevelThreshold(currentLevel + 1);
  const earnedInsideLevel = Math.max(0, currentXP - levelStartXP);
  const levelSize = Math.max(1, nextLevelXP - levelStartXP);

  return {
    levelStartXP,
    nextLevelXP,
    earnedInsideLevel,
    requiredInsideLevel: levelSize,
    progressPercent: Math.min(100, (earnedInsideLevel / levelSize) * 100),
  };
};
