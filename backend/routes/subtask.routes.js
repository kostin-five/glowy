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

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const findUserTask = (taskId, userId) =>
  prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

const getSubTasks = async (req, res) => {
  try {
    const taskId = parseId(req.params.taskId);
    if (!taskId) {
      return res.status(400).json({ error: "Некорректный ID задачи" });
    }

    const task = await findUserTask(taskId, req.user.id);
    if (!task) {
      return res.status(404).json({ error: "Задача не найдена" });
    }

    const subtasks = await prisma.subTask.findMany({
      where: { taskId },
    });
    res.json(subtasks);
  } catch (e) {
    res.status(500).json({ error: "Не удалось загрузить подзадачи" });
    console.error(e);
  }
};

const createSubTask = async (req, res) => {
  try {
    const taskId = parseId(req.body.taskId);
    const title = req.body.title?.trim();

    if (!taskId || !title) {
      return res.status(400).json({ error: "Некорректные данные подзадачи" });
    }

    const task = await findUserTask(taskId, req.user.id);
    if (!task) {
      return res.status(404).json({ error: "Задача не найдена" });
    }

    const newSubTask = await prisma.subTask.create({
      data: {
        taskId,
        title,
        completed: false,
      },
    });
    res.status(201).json(newSubTask);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка при создании" });
  }
};

const updateSubTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const uniqueSubTask = await prisma.subTask.findUnique({
      where: { id: Number(id) },
      include: { task: true },
    });
    if (!uniqueSubTask || uniqueSubTask.task.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }
    const updatedSubTask = await prisma.subTask.update({
      where: { id: Number(id) },
      data: { title, completed },
    });
    res.json(updatedSubTask);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при обновлении" });
  }
};

const deleteSubTask = async (req, res) => {
  try {
    const { id } = req.params;
    const uniqueSubTask = await prisma.subTask.findUnique({
      where: { id: Number(id) },
      include: { task: true },
    });
    if (!uniqueSubTask || uniqueSubTask.task.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }
    await prisma.subTask.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Удалено" });
  } catch (e) {
    res.status(500).json({ error: "Ошибка при удалении" });
  }
};

router.get("/:taskId", getSubTasks);

router.post("/", createSubTask);

router.put("/:id", updateSubTask);

router.delete("/:id", deleteSubTask);

export default router;
