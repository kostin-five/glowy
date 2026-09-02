type AchievementMetric = "tasks" | "streak" | "habits" | "habitStreak";

interface AchievementStore {
  achievement: {
    createMany(input: {
      data: Array<{ userId: number; key: string }>;
      skipDuplicates: true;
    }): PromiseLike<unknown>;
    findMany(input: {
      where: { userId: number };
      orderBy: Array<Record<string, "asc">>;
    }): PromiseLike<Array<{ id: number; key: string; earnedAt: Date }>>;
  };
}

interface AchievementCatalogItem {
  key: string;
  title: string;
  description: string;
  encouragement: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
}

export const ACHIEVEMENT_CATALOG = [
  { key: "tasks_1", title: "Первый шаг", description: "Выполни первую задачу", encouragement: "Начало положено. Дальше можно двигаться в своём темпе.", icon: "sparkles", metric: "tasks", target: 1 },
  { key: "tasks_5", title: "Первые пять", description: "Выполни 5 задач", encouragement: "Пять завершённых дел уже складываются в заметный результат.", icon: "check-circle", metric: "tasks", target: 5 },
  { key: "tasks_10", title: "Десять побед", description: "Выполни 10 задач", encouragement: "Ты уже собрал десять маленьких побед.", icon: "medal", metric: "tasks", target: 10 },
  { key: "tasks_25", title: "Устойчивый темп", description: "Выполни 25 задач", encouragement: "Твой ритм становится устойчивым, без необходимости спешить.", icon: "gauge", metric: "tasks", target: 25 },
  { key: "tasks_50", title: "Полсотни шагов", description: "Выполни 50 задач", encouragement: "Большой путь получился из посильных шагов.", icon: "trophy", metric: "tasks", target: 50 },
  { key: "streak_3", title: "Три дня рядом", description: "Сохрани стрик 3 дня", encouragement: "Три дня подряд — хороший фундамент привычного ритма.", icon: "flame", metric: "streak", target: 3 },
  { key: "streak_7", title: "Неделя в своём ритме", description: "Сохрани стрик 7 дней", encouragement: "Целая неделя последовательных шагов.", icon: "calendar-check", metric: "streak", target: 7 },
  { key: "streak_14", title: "Две спокойные недели", description: "Сохрани стрик 14 дней", encouragement: "Ты поддерживаешь ритм уже две недели.", icon: "sun", metric: "streak", target: 14 },
  { key: "streak_30", title: "Месяц движения", description: "Сохрани стрик 30 дней", encouragement: "Месяц последовательности — серьёзное достижение.", icon: "crown", metric: "streak", target: 30 },
  { key: "first_habit", title: "Первая привычка", description: "Создай первую привычку", encouragement: "Одна понятная привычка лучше длинного списка обещаний.", icon: "sprout", metric: "habits", target: 1 },
  { key: "habits_3", title: "Три опоры", description: "Создай 3 привычки", encouragement: "У тебя появились три регулярные опоры для дня.", icon: "layers", metric: "habits", target: 3 },
  { key: "habit_streak_7", title: "Привычка держится", description: "Отмечай одну привычку 7 дней подряд", encouragement: "Повторение уже превращается в устойчивый ритм.", icon: "repeat", metric: "habitStreak", target: 7 },
] satisfies AchievementCatalogItem[];

type AchievementMetrics = Record<AchievementMetric, number>;

const getMetricValue = (
  item: AchievementCatalogItem,
  metrics: AchievementMetrics
): number => metrics[item.metric] ?? 0;

export const reconcileAchievements = async ({
  db,
  userId,
  completedTaskCount,
  taskStreak,
  habitCount,
  maxHabitStreak = 0,
}: {
  db: AchievementStore;
  userId: number;
  completedTaskCount: number;
  taskStreak: number;
  habitCount: number;
  maxHabitStreak?: number;
}) => {
  const metrics: AchievementMetrics = {
    tasks: completedTaskCount,
    streak: taskStreak,
    habits: habitCount,
    habitStreak: maxHabitStreak,
  };
  const earnedKeys = ACHIEVEMENT_CATALOG.filter(
    (item) => getMetricValue(item, metrics) >= item.target
  ).map((item) => item.key);

  if (earnedKeys.length > 0) {
    await db.achievement.createMany({
      data: earnedKeys.map((key) => ({ userId, key })),
      skipDuplicates: true,
    });
  }

  const awards = await db.achievement.findMany({
    where: { userId },
    orderBy: [{ earnedAt: "asc" }, { id: "asc" }],
  });
  const awardsByKey = new Map(awards.map((award) => [award.key, award]));

  return ACHIEVEMENT_CATALOG.map((item) => {
    const award = awardsByKey.get(item.key);
    return {
      id: award?.id ?? null,
      key: item.key,
      title: item.title,
      description: item.description,
      encouragement: item.encouragement,
      icon: item.icon,
      earned: Boolean(award),
      earnedAt: award?.earnedAt ?? null,
      current: Math.min(item.target, getMetricValue(item, metrics)),
      target: item.target,
    };
  });
};
