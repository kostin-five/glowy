import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { body, validationResult } from "express-validator";

const { PrismaClient } = pkg;
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const router = express.Router();

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

router.use(authMiddleware);

const taskInclude = {
  subtasks: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
};

const LEVEL_THRESHOLDS = [
  0, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7000, 9000, 10000,
];

const getLevelThreshold = (level) => {
  if (level <= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1];
  }

  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - 14) * 2500;
};

const getLevelByXp = (xp) => {
  let level = 1;

  while (xp >= getLevelThreshold(level + 1)) {
    level += 1;
  }

  return level;
};

const getXpReward = (energyLevel = "low", priority = "") => {
  const baseRewardByEnergy = {
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

const buildUserProgress = (user) => ({
  xp: user.xp,
  level: user.level,
});

router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      include: taskInclude,
    });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: "Не удалось загрузить задачи" });
    console.error(e);
  }
});

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Заголовок не может быть пустым").isLength({ max: 255 }).withMessage("Заголовок слишком длинный"),
    body("energyLevel").optional().isIn(["low", "med", "high"]).withMessage("Недопустимый уровень энергии"),
    body("priority").optional().isString().isLength({ max: 50 }),
    body("category").optional().isString().isLength({ max: 100 }),
    body("date").optional().custom((value) => {
      if (!value) return true;
      
      let date;
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      const ruRegex = /^\d{2}\.\d{2}\.\d{4}$/;

      if (isoRegex.test(value)) {
        date = new Date(value);
      } else if (ruRegex.test(value)) {
        const [day, month, year] = value.split(".");
        date = new Date(`${year}-${month}-${day}`);
      } else {
        throw new Error("Некорректный формат даты. Используйте YYYY-MM-DD или DD.MM.YYYY");
      }

      if (isNaN(date.getTime())) {
        throw new Error("Указана несуществующая дата");
      }

      // Дополнительная проверка на реальность даты (например, 31 февраля)
      const [y, m, d] = date.toISOString().split("T")[0].split("-");
      if (isoRegex.test(value)) {
        const [vy, vm, vd] = value.split("-");
        if (y !== vy || m !== vm || d !== vd) throw new Error("Указана несуществующая дата");
      } else {
        const [vd, vm, vy] = value.split(".");
        if (y !== vy || m !== vm || d !== vd) throw new Error("Указана несуществующая дата");
      }

      return true;
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { title, energyLevel, priority, date, category, subtasks } = req.body;
    const subtasksToCreate = Array.isArray(subtasks)
      ? subtasks
          .map((sub, index) => ({
            title: typeof sub.title === "string" ? sub.title.trim() : "",
            completed: Boolean(sub.completed),
            position: Number.isInteger(sub.position) ? sub.position : index,
          }))
          .filter((sub) => sub.title.length > 0)
      : [];

    const newTask = await prisma.task.create({
      data: {
        title,
        energyLevel,
        category,
        date,
        priority,
        completed: false,
        userId: req.user.id,
        subtasks: subtasksToCreate.length
          ? {
              create: subtasksToCreate,
            }
          : undefined,
      },

      include: taskInclude,
    });

    res.status(201).json(newTask);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка при создании" });
  }
});

router.put(
  "/:id",
  [
    body("title").optional().trim().notEmpty().withMessage("Заголовок не может быть пустым").isLength({ max: 255 }).withMessage("Заголовок слишком длинный"),
    body("energyLevel").optional().isIn(["low", "med", "high"]).withMessage("Недопустимый уровень энергии"),
    body("completed").optional().isBoolean().withMessage("Должно быть логическим значением"),
    body("priority").optional().isString().isLength({ max: 50 }),
    body("category").optional().isString().isLength({ max: 100 }),
    body("date").optional().custom((value) => {
      if (!value) return true;

      let date;
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      const ruRegex = /^\d{2}\.\d{2}\.\d{4}$/;

      if (isoRegex.test(value)) {
        date = new Date(value);
      } else if (ruRegex.test(value)) {
        const [day, month, year] = value.split(".");
        date = new Date(`${year}-${month}-${day}`);
      } else {
        throw new Error("Некорректный формат даты. Используйте YYYY-MM-DD или DD.MM.YYYY");
      }

      if (isNaN(date.getTime())) {
        throw new Error("Указана несуществующая дата");
      }

      const [y, m, d] = date.toISOString().split("T")[0].split("-");
      if (isoRegex.test(value)) {
        const [vy, vm, vd] = value.split("-");
        if (y !== vy || m !== vm || d !== vd) throw new Error("Указана несуществующая дата");
      } else {
        const [vd, vm, vy] = value.split(".");
        if (y !== vy || m !== vm || d !== vd) throw new Error("Указана несуществующая дата");
      }

      return true;
    }),
  ],
  async (req, res) => {
    try {
      const taskId = parseId(req.params.id);
      if (!taskId) {
        return res.status(400).json({ error: "Некорректный ID задачи" });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { title, energyLevel, priority, date, category, completed, subtasks } =
      req.body;
    const uniqueTask = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }

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
        xpReward = getXpReward(energyLevel, priority);
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
    res.status(500).json({ error: "Ошибка при обновлении" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const taskId = parseId(req.params.id);
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
    res.status(500).json({ error: "Ошибка при удалении" });
  }
});

export default router;
