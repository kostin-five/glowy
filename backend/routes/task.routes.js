import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { createTaskForUser } from "../services/tasks/task-write.service.js";
import {
  buildUserProgress,
  getLevelByXp,
  getXpReward,
} from "../services/tasks/task-completion.service.js";
import {
  addDaysToDateOnly,
  isDateOnly,
  normalizeOptionalMinutes,
  parsePositiveId,
} from "../utils/validation.utils.js";

const router = express.Router();

router.use(authMiddleware);

const taskInclude = {
  subtasks: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
  noteLinks: {
    include: {
      note: { select: { id: true, title: true, archived: true } },
    },
  },
};

const dateValidator = (value) => {
  if (!value || isDateOnly(value)) return true;
  throw new Error("Некорректный формат даты. Используйте YYYY-MM-DD");
};

const minutesValidator = (value) => {
  if (normalizeOptionalMinutes(value).valid) return true;
  throw new Error("Время должно быть целым числом от 1 до 1440 минут");
};

export const isAcceptableCompletionDate = (value, now = new Date()) => {
  if (!isDateOnly(value)) return false;

  // A local calendar day may already be tomorrow relative to UTC.
  const latestLocalDate = addDaysToDateOnly(now.toISOString().slice(0, 10), 1);
  return value <= latestLocalDate;
};

router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      include: taskInclude,
    });
    res.json(tasks);
  } catch (e) {
    logger.error("tasks.list.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Не удалось загрузить задачи" });
  }
});

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Заголовок не может быть пустым").isLength({ max: 255 }).withMessage("Заголовок слишком длинный"),
    body("energyLevel").optional().isIn(["low", "med", "high"]).withMessage("Недопустимый уровень энергии"),
    body("priority").optional().isString().isLength({ max: 50 }),
    body("category").optional().isString().isLength({ max: 100 }),
    body("date").optional().custom(dateValidator),
    body("estimatedMinutes").optional({ nullable: true }).custom(minutesValidator),
    body("actualMinutes").optional({ nullable: true }).custom(minutesValidator),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const newTask = await createTaskForUser({
        userId: req.user.id,
        input: req.body,
        include: taskInclude,
      });

      return res.status(201).json(newTask);
    } catch (e) {
      logger.error("tasks.create.failed", { req, error: e, statusCode: e?.status || 500 });
      return res.status(e?.status || 500).json({
        error: e?.status === 400 ? e.message : "Ошибка при создании",
      });
    }
  }
);

router.put(
  "/:id",
  [
    body("title").optional().trim().notEmpty().withMessage("Заголовок не может быть пустым").isLength({ max: 255 }).withMessage("Заголовок слишком длинный"),
    body("energyLevel").optional().isIn(["low", "med", "high"]).withMessage("Недопустимый уровень энергии"),
    body("completed").optional().isBoolean().withMessage("Должно быть логическим значением"),
    body("priority").optional().isString().isLength({ max: 50 }),
    body("category").optional().isString().isLength({ max: 100 }),
    body("date").optional().custom(dateValidator),
    body("completedOn").optional({ nullable: true }).custom(dateValidator),
    body("estimatedMinutes").optional({ nullable: true }).custom(minutesValidator),
    body("actualMinutes").optional({ nullable: true }).custom(minutesValidator),
  ],
  async (req, res) => {
    try {
      const taskId = parsePositiveId(req.params.id);
      if (!taskId) {
        return res.status(400).json({ error: "Некорректный ID задачи" });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const {
        title,
        energyLevel,
        priority,
        date,
        category,
        completed,
        completedOn,
        estimatedMinutes,
        actualMinutes,
        subtasks,
      } = req.body;
    const uniqueTask = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }

    const isCompleting = completed === true && !uniqueTask.completed;
    if (isCompleting && !isAcceptableCompletionDate(completedOn)) {
      return res.status(400).json({
        error: "При выполнении задачи укажите текущую дату в формате YYYY-MM-DD",
      });
    }

    const normalizedEstimate = normalizeOptionalMinutes(estimatedMinutes).value;
    const normalizedActual = normalizeOptionalMinutes(actualMinutes).value;
    const nextCompletedOn =
      completed === false
        ? null
        : isCompleting
          ? completedOn
          : completedOn === undefined
            ? uniqueTask.completedOn
            : completedOn;

    const orderedSubtasks = Array.isArray(subtasks)
      ? subtasks
          .map((sub, index) => ({
            id: Number(sub.id),
            position: index,
          }))
          .filter((sub) => Number.isInteger(sub.id) && sub.id > 0)
      : [];

    const result = await prisma.$transaction(async (tx) => {
      let xpReward = 0;
      let updatedUser = null;
      const shouldAwardXp =
        completed === true && !uniqueTask.completed && !uniqueTask.xpAwarded;

      if (shouldAwardXp) {
        xpReward = getXpReward(
          energyLevel ?? uniqueTask.energyLevel,
          priority ?? uniqueTask.priority
        );
        const user = await tx.user.findUnique({
          where: { id: req.user.id },
          select: { xp: true },
        });
        const nextXp = (user?.xp ?? 0) + xpReward;

        updatedUser = await tx.user.update({
          where: { id: req.user.id },
          data: {
            xp: nextXp,
            level: getLevelByXp(nextXp),
          },
          select: {
            xp: true,
            level: true,
          },
        });
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          title,
          energyLevel,
          priority,
          date,
          category,
          completed,
          completedOn: nextCompletedOn,
          estimatedMinutes:
            estimatedMinutes === undefined ? undefined : normalizedEstimate,
          actualMinutes:
            actualMinutes === undefined ? undefined : normalizedActual,
          xpAwarded: uniqueTask.xpAwarded || shouldAwardXp,
        },
      });

      if (orderedSubtasks.length > 0) {
        await Promise.all(
          orderedSubtasks.map((sub) =>
            tx.subTask.updateMany({
              where: {
                id: sub.id,
                taskId,
              },
              data: {
                position: sub.position,
              },
            })
          )
        );
      }

      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: taskInclude,
      });

      return {
        task,
        xpReward,
        userProgress: updatedUser ? buildUserProgress(updatedUser) : null,
      };
    });

    res.json(result);
  } catch (e) {
    logger.error("tasks.update.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Ошибка при обновлении" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const taskId = parsePositiveId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: "Некорректный ID задачи" });
    }

    const uniqueTask = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }
    await prisma.task.delete({
      where: { id: taskId },
    });
    res.json({ message: "Удалено" });
  } catch (e) {
    logger.error("tasks.delete.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Ошибка при удалении" });
  }
});

export default router;
