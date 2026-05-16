import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

router.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();
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
      data: { title, energyLevel, category, date, priority, completed: false },
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
    await prisma.task.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Удалено" });
  } catch (e) {
    res.status(500).json({ error: "Ошибка при удалении" });
  }
});

export default router;
