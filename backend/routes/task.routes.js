import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { authMiddleware } from "../middleware/auth.middleware.js";

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

router.use(authMiddleware);

const taskInclude = {
  subtasks: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
};

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

router.post("/", async (req, res) => {
  try {
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

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, energyLevel, priority, date, category, completed, subtasks } =
      req.body;
    const taskId = Number(id);
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

    const updatedTask = await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { title, energyLevel, priority, date, category, completed },
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

      return tx.task.findUnique({
        where: { id: taskId },
        include: taskInclude,
      });
    });

    res.json(updatedTask);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при обновлении" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const uniqueTask = await prisma.task.findUnique({
      where: { id: Number(id) },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }
    await prisma.task.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Удалено" });
  } catch (e) {
    res.status(500).json({ error: "Ошибка при удалении" });
  }
});

export default router;
