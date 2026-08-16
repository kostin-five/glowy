import { isFocusEntitled } from "../feature-entitlements.service.js";
import { calculateStreak } from "../progress/progress.service.js";
import { addDaysToDateOnly, isDateOnly } from "../../utils/validation.utils.js";

const ENERGY_LEVELS = ["low", "med", "high"];

const getWeekStart = (anchor) => {
  const date = new Date(`${anchor}T00:00:00.000Z`);
  const day = date.getUTCDay();
  return addDaysToDateOnly(anchor, -(day === 0 ? 6 : day - 1));
};

export const getAnalyticsPeriod = (kind, anchor) => {
  if (!isDateOnly(anchor) || !["week", "month"].includes(kind)) {
    throw new Error("INVALID_ANALYTICS_PERIOD");
  }

  const from = kind === "week" ? getWeekStart(anchor) : `${anchor.slice(0, 7)}-01`;

  if (kind === "week") {
    return { kind, from, to: addDaysToDateOnly(from, 6) };
  }

  const monthStart = new Date(`${from}T00:00:00.000Z`);
  const monthEnd = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
  )
    .toISOString()
    .slice(0, 10);

  return { kind, from, to: monthEnd };
};

const buildDailyCompleted = (from, to, tasks) => {
  const counts = tasks.reduce((result, task) => {
    result[task.completedOn] = (result[task.completedOn] || 0) + 1;
    return result;
  }, {});
  const days = [];

  for (let date = from; date <= to; date = addDaysToDateOnly(date, 1)) {
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
}) => {
  const energyDistribution = Object.fromEntries(
    ENERGY_LEVELS.map((level) => [
      level,
      periodTasks.filter((task) => task.energyLevel === level).length,
    ])
  );
  const tasksWithEstimate = periodTasks.filter(
    (task) => Number.isInteger(task.estimatedMinutes) && task.estimatedMinutes > 0
  );
  const tasksWithActual = periodTasks.filter(
    (task) => Number.isInteger(task.actualMinutes) && task.actualMinutes > 0
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
        (sum, task) => sum + task.estimatedMinutes,
        0
      ),
      actualMinutes: tasksWithActual.reduce(
        (sum, task) => sum + task.actualMinutes,
        0
      ),
      tasksWithEstimate: tasksWithEstimate.length,
      tasksWithActual: tasksWithActual.length,
    },
    hasActivity: periodTasks.length > 0,
  };
};

export const getAnalyticsAccess = (user) => {
  const canUseFocusFeatures = isFocusEntitled(user);

  return {
    canUseFocusFeatures,
    focusBetaAvailable: canUseFocusFeatures,
    focusBetaEnabled: canUseFocusFeatures,
    canRequestAiInsight: canUseFocusFeatures,
  };
};

export const loadAnalyticsSnapshot = async ({ db, userId, kind, anchor }) => {
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
      periodTasks,
      allCompletedDates: allCompletedTasks.map((task) => task.completedOn),
      rescueDates: rescues.map((rescue) => rescue.protectedOn),
      anchor,
    }),
    ...getAnalyticsAccess(user),
  };
};

export const buildAnalyticsInsightPrompt = (snapshot, aiTone = "calm") => {
  const tone =
    aiTone === "strict"
      ? "прямо и требовательно, но без стыда, угроз и оценки личности"
      : aiTone === "moderate"
        ? "спокойно и прямо, с одним ясным следующим шагом"
        : "мягко и поддерживающе, без давления";

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
