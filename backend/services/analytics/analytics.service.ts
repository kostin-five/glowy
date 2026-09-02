import { isFocusEntitled } from "../feature-entitlements.service.js";
import { calculateStreak } from "../progress/progress.service.js";
import { addDaysToDateOnly, isDateOnly } from "../../utils/validation.utils.js";
import type { PrismaClient, User } from "@prisma/client";

const ENERGY_LEVELS = ["low", "med", "high"] as const;
export type AnalyticsKind = "week" | "month";

export interface AnalyticsPeriod {
  kind: AnalyticsKind;
  from: string;
  to: string;
}

interface AnalyticsTask {
  completedOn: string;
  energyLevel: string;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
}

export interface AnalyticsSnapshot {
  period: AnalyticsPeriod;
  completedTasks: number;
  dailyCompleted: Array<{ date: string; completedTasks: number }>;
  energyDistribution: Record<(typeof ENERGY_LEVELS)[number], number>;
  taskStreak: number;
  time: {
    estimatedMinutes: number;
    actualMinutes: number;
    tasksWithEstimate: number;
    tasksWithActual: number;
  };
  hasActivity: boolean;
  canUseFocusFeatures: boolean;
  focusBetaAvailable: boolean;
  focusBetaEnabled: boolean;
  canRequestAiInsight: boolean;
}

const shiftDate = (date: string, days: number): string => {
  const shifted = addDaysToDateOnly(date, days);
  if (!shifted) throw new Error("INVALID_ANALYTICS_PERIOD");
  return shifted;
};

const getWeekStart = (anchor: string): string => {
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const day = date.getUTCDay();
  return shiftDate(anchor, -(day === 0 ? 6 : day - 1));
};

export const getAnalyticsPeriod = (
  kind: unknown,
  anchor: unknown
): AnalyticsPeriod => {
  if (
    !isDateOnly(anchor) ||
    (kind !== "week" && kind !== "month")
  ) {
    throw new Error("INVALID_ANALYTICS_PERIOD");
  }

  const from = kind === "week" ? getWeekStart(anchor) : `${anchor.slice(0, 7)}-01`;

  if (kind === "week") {
    return { kind, from, to: shiftDate(from, 6) };
  }

  const monthStart = new Date(`${from}T00:00:00.000Z`);
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
  )
    .toISOString()
    .slice(0, 10);

  return { kind, from, to: monthEnd };
};

const buildDailyCompleted = (
  from: string,
  to: string,
  tasks: AnalyticsTask[]
) => {
  const counts = tasks.reduce<Record<string, number>>((result, task) => {
    result[task.completedOn] = (result[task.completedOn] || 0) + 1;
    return result;
  }, {});
  const days: Array<{ date: string; completedTasks: number }> = [];

  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    days.push({ date, completedTasks: counts[date] || 0 });
  }

  return days;
};

export const aggregateAnalytics = ({
  period,
  periodTasks,
  allCompletedDates,
  rescueDates = [],
  anchor,
}: {
  period: AnalyticsPeriod;
  periodTasks: AnalyticsTask[];
  allCompletedDates: unknown[];
  rescueDates?: unknown[];
  anchor: string;
}): Omit<
  AnalyticsSnapshot,
  | "canUseFocusFeatures"
  | "focusBetaAvailable"
  | "focusBetaEnabled"
  | "canRequestAiInsight"
> => {
  const energyDistribution = Object.fromEntries(
    ENERGY_LEVELS.map((level) => [
      level,
      periodTasks.filter((task) => task.energyLevel === level).length,
    ])
  ) as AnalyticsSnapshot["energyDistribution"];
  const tasksWithEstimate = periodTasks.filter(
    (task) =>
      Number.isInteger(task.estimatedMinutes) && Number(task.estimatedMinutes) > 0
  );
  const tasksWithActual = periodTasks.filter(
    (task) =>
      Number.isInteger(task.actualMinutes) && Number(task.actualMinutes) > 0
  );

  return {
    period,
    completedTasks: periodTasks.length,
    dailyCompleted: buildDailyCompleted(period.from, period.to, periodTasks),
    energyDistribution,
    taskStreak: calculateStreak({
      activeDates: allCompletedDates,
      rescueDates,
      today: anchor,
    }).current,
    time: {
      estimatedMinutes: tasksWithEstimate.reduce(
        (sum, task) => sum + (task.estimatedMinutes || 0),
        0
      ),
      actualMinutes: tasksWithActual.reduce(
        (sum, task) => sum + (task.actualMinutes || 0),
        0
      ),
      tasksWithEstimate: tasksWithEstimate.length,
      tasksWithActual: tasksWithActual.length,
    },
    hasActivity: periodTasks.length > 0,
  };
};

export const getAnalyticsAccess = (
  user: Pick<User, "plan" | "subscriptionStatus" | "planExpiresAt">
) => {
  const canUseFocusFeatures = isFocusEntitled(user);

  return {
    canUseFocusFeatures,
    focusBetaAvailable: canUseFocusFeatures,
    focusBetaEnabled: canUseFocusFeatures,
    canRequestAiInsight: canUseFocusFeatures,
  };
};

export const loadAnalyticsSnapshot = async ({
  db,
  userId,
  kind,
  anchor,
}: {
  db: PrismaClient;
  userId: number;
  kind: AnalyticsKind;
  anchor: string;
}): Promise<AnalyticsSnapshot> => {
  const period = getAnalyticsPeriod(kind, anchor);
  const [user, periodTasks, allCompletedTasks, rescues] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    }),
    db.task.findMany({
      where: {
        userId,
        completed: true,
        completedOn: { gte: period.from, lte: period.to },
      },
      select: {
        completedOn: true,
        energyLevel: true,
        estimatedMinutes: true,
        actualMinutes: true,
      },
    }),
    db.task.findMany({
      where: { userId, completed: true, completedOn: { not: null } },
      select: { completedOn: true },
    }),
    db.streakRescue.findMany({
      where: { userId },
      select: { protectedOn: true },
    }),
  ]);

  if (!user) throw new Error("USER_NOT_FOUND");

  return {
    ...aggregateAnalytics({
      period,
      periodTasks: periodTasks.filter(
        (task): task is typeof task & { completedOn: string } =>
          typeof task.completedOn === "string"
      ),
      allCompletedDates: allCompletedTasks.map((task) => task.completedOn),
      rescueDates: rescues.map((rescue) => rescue.protectedOn),
      anchor,
    }),
    ...getAnalyticsAccess(user),
  };
};

export const buildAnalyticsInsightPrompt = (
  snapshot: AnalyticsSnapshot,
  aiTone = "calm"
): string => {
  const tone =
    aiTone === "strict"
      ? "жёстко и требовательно: прямо назови невыполненное действие и потребуй конкретное решение, но не стыди, не угрожай и не оценивай личность"
      : aiTone === "moderate"
        ? "нейтрально и прямо, без утешений и критики, с одним ясным следующим шагом"
        : "мягко и поддерживающе, признавая усилия и предлагая небольшой шаг без давления";

  const dailyCompleted = snapshot.dailyCompleted
    .map((day) => `${day.date}: ${day.completedTasks}`)
    .join(", ");

  return `Ты — Glowy, помощник по личной продуктивности. Подготовь глубокий разбор обезличенной аналитики ${tone}.
Ответь компактно и структурированно: «Итог периода», «Что заметно», «Что попробовать дальше». Дай 2-3 конкретных и реалистичных шага. Не придумывай причины, диагнозы, обстоятельства или данные, которых нет ниже. Не стыди пользователя и не оценивай его личность.
Период: ${snapshot.period.kind}, ${snapshot.period.from} — ${snapshot.period.to}.
Выполнено задач: ${snapshot.completedTasks}.
Выполнено по дням: ${dailyCompleted}.
По энергии: low=${snapshot.energyDistribution.low}, med=${snapshot.energyDistribution.med}, high=${snapshot.energyDistribution.high}.
Текущий стрик: ${snapshot.taskStreak}.
Плановое время: ${snapshot.time.estimatedMinutes} минут по ${snapshot.time.tasksWithEstimate} задачам.
Фактическое время: ${snapshot.time.actualMinutes} минут по ${snapshot.time.tasksWithActual} задачам.`;
};
