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

router.get("/subtask/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const subtasks = await prisma.subTask.findMany({
      where: { taskId: Number(taskId) },
    });
    res.json(subtasks);
  } catch (e) {
    res.status(500).json({ error: "Не удалось загрузить подзадачи" });
    console.error(e);
  }
});

router.post("/subtask", async (req, res) => {
  try {
    const { taskId, title } = req.body;
    const newSubTask = await prisma.subTask.create({
      data: {
        taskId,
        title,
        completed: false,
      },
    });
    res.status(201).json(newSubTask);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при создании" });
  }
});

router.put("/subtask/:id", async (req, res) => {
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
});

router.delete("/subtask/:id", async (req, res) => {
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
});

export default router;
