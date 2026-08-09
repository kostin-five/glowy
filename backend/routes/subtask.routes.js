import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

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
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    res.json(subtasks);
  } catch (e) {
    logger.error("subtasks.list.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Не удалось загрузить подзадачи" });
  }
};

const createSubTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const taskId = parseId(req.body.taskId);
    const title = req.body.title?.trim();

    if (!taskId || !title) {
      return res.status(400).json({ error: "Некорректные данные подзадачи" });
    }

    const task = await findUserTask(taskId, req.user.id);
    if (!task) {
      return res.status(404).json({ error: "Задача не найдена" });
    }

    const lastSubTask = await prisma.subTask.findFirst({
      where: { taskId },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });

    const newSubTask = await prisma.subTask.create({
      data: {
        taskId,
        title,
        completed: false,
        position: lastSubTask ? lastSubTask.position + 1 : 0,
      },
    });
    res.status(201).json(newSubTask);
  } catch (e) {
    logger.error("subtasks.create.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Ошибка при создании" });
  }
};

const updateSubTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { id } = req.params;
    const { title, completed, position } = req.body;
    const uniqueSubTask = await prisma.subTask.findUnique({
      where: { id: Number(id) },
      include: { task: true },
    });
    if (!uniqueSubTask || uniqueSubTask.task.userId !== req.user.id) {
      return res.status(403).json({ error: "Нет доступа к этой задаче" });
    }
    const data = {};

    if (typeof title === "string") {
      data.title = title;
    }

    if (typeof completed === "boolean") {
      data.completed = completed;
    }

    if (Number.isInteger(position)) {
      data.position = position;
    }

    const updatedSubTask = await prisma.subTask.update({
      where: { id: Number(id) },
      data,
    });
    res.json(updatedSubTask);
  } catch (e) {
    logger.error("subtasks.update.failed", { req, error: e, statusCode: 500 });
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
    logger.error("subtasks.delete.failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Ошибка при удалении" });
  }
};

router.get("/:taskId", getSubTasks);

router.post(
  "/",
  [
    body("taskId").isInt({ min: 1 }).withMessage("Некорректный ID задачи"),
    body("title").trim().notEmpty().withMessage("Заголовок не может быть пустым").isLength({ max: 255 }).withMessage("Заголовок слишком длинный"),
  ],
  createSubTask
);

router.put(
  "/:id",
  [
    body("title").optional().trim().notEmpty().withMessage("Заголовок не может быть пустым").isLength({ max: 255 }).withMessage("Заголовок слишком длинный"),
    body("completed").optional().isBoolean().withMessage("Должно быть логическим значением"),
    body("position").optional().isInt().withMessage("Должно быть целым числом"),
  ],
  updateSubTask
);

router.delete("/:id", deleteSubTask);

export default router;
