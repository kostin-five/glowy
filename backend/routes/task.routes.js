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

router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
    });
    res.json(tasks);
  } catch (e) {
    res.status(500).json({ error: "Не удалось загрузить задачи" });
    console.error(e);
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, energyLevel, priority, date, category } = req.body;
    const newTask = await prisma.task.create({
      data: {
        title,
        energyLevel,
        category,
        date,
        priority,
        completed: false,
        userId: req.user.id,
      },
    });
    res.status(201).json(newTask);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при создании" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, energyLevel, priority, date, category, completed } =
      req.body;
    const uniqueTask = await prisma.task.findUnique({
      where: { id: Number(id) },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }
    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: { title, energyLevel, priority, date, category, completed },
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
