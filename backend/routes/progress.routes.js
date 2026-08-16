import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  calculateHabitStreak,
  calculateStreak,
  findRescueEligibleDate,
  getMonthPrefix,
} from "../services/progress/progress.service.js";
import { reconcileAchievements } from "../services/progress/achievements.service.js";
import { isFocusEntitled } from "../services/feature-entitlements.service.js";
import { isDateOnly, parsePositiveId } from "../utils/validation.utils.js";

const MONTHLY_RESCUE_LIMIT = 3;
const LEVEL_THRESHOLDS = [
  0, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 9000, 10000,
];

const getNextLevelAt = (level) =>
  level < LEVEL_THRESHOLDS.length
    ? LEVEL_THRESHOLDS[level]
    : LEVEL_THRESHOLDS.at(-1) + (level - 13) * 2500;

const summarizeHabit = (habit, today) => ({
  id: habit.id,
  title: habit.title,
  archived: habit.archived,
  currentStreak: calculateHabitStreak(
    habit.checks.map((check) => check.completedOn),
    today
  ),
  checkedToday: habit.checks.some((check) => check.completedOn === today),
  checkDates: habit.checks.map((check) => check.completedOn).sort(),
  createdAt: habit.createdAt,
  updatedAt: habit.updatedAt,
});

const loadHabitSummary = async (db, userId, habitId, today) => {
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId },
    include: { checks: true },
  });

  return habit ? summarizeHabit(habit, today) : null;
};

export const buildProgressOverview = async ({ db, userId, today }) => {
  const [user, completedTasks, rescues, habits, habitCount] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    }),
    db.task.findMany({
      where: { userId, completed: true, completedOn: { not: null } },
      select: { completedOn: true },
    }),
    db.streakRescue.findMany({
      where: { userId },
      orderBy: { protectedOn: "asc" },
    }),
    db.habit.findMany({
      where: { userId },
      include: { checks: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    db.habit.count({ where: { userId } }),
  ]);

  if (!user) throw new Error("USER_NOT_FOUND");

  const activeDates = completedTasks.map((task) => task.completedOn);
  const rescueDates = rescues.map((rescue) => rescue.protectedOn);
  const streak = calculateStreak({ activeDates, rescueDates, today });
  const canUseFocusFeatures = isFocusEntitled(user);
  const monthPrefix = getMonthPrefix(today);
  const usedDates = rescueDates.filter((date) => date.startsWith(monthPrefix));
  const achievements = await reconcileAchievements({
    db,
    userId,
    completedTaskCount: completedTasks.length,
    taskStreak: streak.current,
    habitCount,
    maxHabitStreak: habits.reduce(
      (maximum, habit) =>
        Math.max(
          maximum,
          calculateHabitStreak(
            habit.checks.map((check) => check.completedOn),
            today
          )
        ),
      0
    ),
  });

  return {
    xp: {
      current: user.xp,
      level: user.level,
      nextLevelAt: getNextLevelAt(user.level),
    },
    taskStreak: {
      current: streak.current,
      longest: streak.longest,
      lastActiveOn: streak.lastActiveOn,
      days:
        streak.current > 0
          ? [...streak.streakSet].sort().slice(-streak.current)
          : [],
      missedDateEligibleForRescue: findRescueEligibleDate({
        activeDates,
        rescueDates,
        today,
      }),
    },
    rescues: {
      remaining: Math.max(0, MONTHLY_RESCUE_LIMIT - usedDates.length),
      monthlyLimit: MONTHLY_RESCUE_LIMIT,
      usedDates,
    },
    habits: habits.map((habit) => summarizeHabit(habit, today)),
    achievements,
    canUseFocusFeatures,
  };
};

const validateToday = (value) => {
  if (isDateOnly(value)) return true;
  throw new Error("Укажите дату в формате YYYY-MM-DD");
};

export const createProgressRouter = ({
  db = prisma,
  authenticate = authMiddleware,
} = {}) => {
  const router = express.Router();
  router.use(authenticate);

  router.get("/", async (req, res) => {
    const today = req.query.today;
    if (!isDateOnly(today)) {
      return res.status(400).json({ error: "Укажите today в формате YYYY-MM-DD" });
    }

    try {
      return res.json(
        await buildProgressOverview({ db, userId: req.user.id, today })
      );
    } catch (error) {
      logger.error("progress.overview.failed", { req, error, statusCode: 500 });
      return res.status(500).json({ error: "Не удалось загрузить прогресс" });
    }
  });

  router.post(
    "/rescues",
    [body("protectedOn").custom(validateToday), body("today").custom(validateToday)],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { protectedOn, today } = req.body;
      if (protectedOn >= today) {
        return res.status(400).json({ error: "Можно защитить только прошедший день" });
      }

      try {
        const outcome = await db.$transaction(async (tx) => {
          const duplicate = await tx.streakRescue.findUnique({
            where: { userId_protectedOn: { userId: req.user.id, protectedOn } },
          });
          if (duplicate) return "duplicate";

          const [tasks, rescues] = await Promise.all([
            tx.task.findMany({
              where: {
                userId: req.user.id,
                completed: true,
                completedOn: { not: null },
              },
              select: { completedOn: true },
            }),
            tx.streakRescue.findMany({ where: { userId: req.user.id } }),
          ]);
          const rescueDates = rescues.map((item) => item.protectedOn);
          const eligible = findRescueEligibleDate({
            activeDates: tasks.map((task) => task.completedOn),
            rescueDates,
            today,
          });
          if (eligible !== protectedOn) return "ineligible";

          const monthPrefix = getMonthPrefix(protectedOn);
          const monthlyUses = rescueDates.filter((date) =>
            date.startsWith(monthPrefix)
          ).length;
          if (monthlyUses >= MONTHLY_RESCUE_LIMIT) return "exhausted";

          await tx.streakRescue.create({
            data: { userId: req.user.id, protectedOn },
          });
          return "created";
        });

        if (outcome === "duplicate" || outcome === "exhausted") {
          return res.status(409).json({
            error:
              outcome === "duplicate"
                ? "Этот день уже защищен"
                : "В этом месяце спасательные круги закончились",
          });
        }
        if (outcome === "ineligible") {
          return res.status(400).json({ error: "Этот день не соединяет текущий стрик" });
        }

        return res.status(201).json(
          await buildProgressOverview({ db, userId: req.user.id, today })
        );
      } catch (error) {
        logger.error("progress.rescue.failed", { req, error, statusCode: 500 });
        return res.status(500).json({ error: "Не удалось применить спасательный круг" });
      }
    }
  );

  router.post(
    "/habits",
    [body("title").trim().notEmpty().isLength({ max: 120 })],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const today = req.body.today;
      if (!isDateOnly(today)) {
        return res.status(400).json({ error: "Укажите today в формате YYYY-MM-DD" });
      }

      try {
        const habit = await db.habit.create({
          data: { userId: req.user.id, title: req.body.title },
          include: { checks: true },
        });
        return res.status(201).json(summarizeHabit(habit, today));
      } catch (error) {
        logger.error("progress.habit.create.failed", { req, error, statusCode: 500 });
        return res.status(500).json({ error: "Не удалось создать привычку" });
      }
    }
  );

  router.patch(
    "/habits/:id",
    [
      body("title").optional().trim().notEmpty().isLength({ max: 120 }),
      body("archived").optional().isBoolean(),
      body("today").custom(validateToday),
    ],
    async (req, res) => {
      const habitId = parsePositiveId(req.params.id);
      const errors = validationResult(req);
      if (!habitId || !errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const habit = await db.habit.findFirst({
        where: { id: habitId, userId: req.user.id },
      });
      if (!habit) return res.status(404).json({ error: "Привычка не найдена" });

      await db.habit.update({
        where: { id: habitId },
        data: { title: req.body.title, archived: req.body.archived },
      });
      return res.json(
        await loadHabitSummary(db, req.user.id, habitId, req.body.today)
      );
    }
  );

  router.put(
    "/habits/:id/checks/:date",
    async (req, res) => {
      const habitId = parsePositiveId(req.params.id);
      const date = req.params.date;
      const today = req.query.today;
      if (!habitId || !isDateOnly(date) || !isDateOnly(today)) {
        return res.status(400).json({ error: "Некорректная привычка или дата" });
      }

      const habit = await db.habit.findFirst({
        where: { id: habitId, userId: req.user.id, archived: false },
      });
      if (!habit) return res.status(404).json({ error: "Привычка не найдена" });

      const existing = await db.habitCheck.findUnique({
        where: { habitId_completedOn: { habitId, completedOn: date } },
      });
      if (!existing) {
        await db.habitCheck.create({ data: { habitId, completedOn: date } });
      }
      return res.status(existing ? 200 : 201).json(
        await loadHabitSummary(db, req.user.id, habitId, today)
      );
    }
  );

  router.delete("/habits/:id/checks/:date", async (req, res) => {
    const habitId = parsePositiveId(req.params.id);
    const date = req.params.date;
    const today = req.query.today;
    if (!habitId || !isDateOnly(date) || !isDateOnly(today)) {
      return res.status(400).json({ error: "Некорректная привычка или дата" });
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, userId: req.user.id },
    });
    if (!habit) return res.status(404).json({ error: "Привычка не найдена" });

    await db.habitCheck.deleteMany({ where: { habitId, completedOn: date } });
    return res.json(await loadHabitSummary(db, req.user.id, habitId, today));
  });

  router.delete("/habits/:id", async (req, res) => {
    const habitId = parsePositiveId(req.params.id);
    if (!habitId) return res.status(400).json({ error: "Некорректная привычка" });

    const result = await db.habit.deleteMany({
      where: { id: habitId, userId: req.user.id },
    });
    if (!result.count) return res.status(404).json({ error: "Привычка не найдена" });
    return res.status(204).send();
  });

  return router;
};

export default createProgressRouter();
