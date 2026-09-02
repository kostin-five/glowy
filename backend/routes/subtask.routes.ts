import express from "express";
import type { Request, RequestHandler, Router } from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import { body, validationResult } from "express-validator";
import {
  subTaskCreateRequestSchema,
  subTaskSchema,
  subTaskUpdateRequestSchema,
  taskDeleteResponseSchema,
} from "@glowy/contracts";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { buildErrorEnvelope } from "../middleware/error.middleware.js";

const parseId = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const buildSubTaskError = (req: Request, error: string, code: string) =>
  buildErrorEnvelope(req, error, code);

export const createSubTaskRouter = ({
  db = prisma,
  authenticate = authMiddleware,
}: {
  db?: PrismaClient;
  authenticate?: RequestHandler;
} = {}): Router => {
const router = express.Router();

router.use(authenticate);

const findUserTask = (taskId: number, userId: number) =>
  db.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

const getSubTasks: RequestHandler = async (req, res) => {
  try {
    const taskId = parseId(req.params.taskId);
    if (!taskId) {
      return res
        .status(400)
        .json(buildSubTaskError(req, "Некорректный ID задачи", "SUBTASK_INVALID_ID"));
    }

    const task = await findUserTask(taskId, req.user.id);
    if (!task) {
      return res
        .status(404)
        .json(buildSubTaskError(req, "Задача не найдена", "TASK_NOT_FOUND"));
    }

    const subtasks = await db.subTask.findMany({
      where: { taskId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    res.json(subtasks.map((subtask) => subTaskSchema.parse(subtask)));
  } catch (e) {
    logger.error("subtasks.list.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildSubTaskError(req, "Не удалось загрузить подзадачи", "SUBTASK_LIST_FAILED"));
  }
};

const createSubTask: RequestHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(buildSubTaskError(req, "Проверьте данные подзадачи", "SUBTASK_INVALID_INPUT"));
    }
    const requestResult = subTaskCreateRequestSchema.safeParse(req.body);
    const taskId = requestResult.success ? requestResult.data.taskId : null;
    const title = requestResult.success ? requestResult.data.title : "";

    if (!taskId || !title) {
      return res
        .status(400)
        .json(buildSubTaskError(req, "Некорректные данные подзадачи", "SUBTASK_INVALID_INPUT"));
    }

    const task = await findUserTask(taskId, req.user.id);
    if (!task) {
      return res
        .status(404)
        .json(buildSubTaskError(req, "Задача не найдена", "TASK_NOT_FOUND"));
    }

    const lastSubTask = await db.subTask.findFirst({
      where: { taskId },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });

    const newSubTask = await db.subTask.create({
      data: {
        taskId,
        title,
        completed: false,
        position: lastSubTask ? lastSubTask.position + 1 : 0,
      },
    });
    res.status(201).json(subTaskSchema.parse(newSubTask));
  } catch (e) {
    logger.error("subtasks.create.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildSubTaskError(req, "Ошибка при создании", "SUBTASK_CREATE_FAILED"));
  }
};

const updateSubTask: RequestHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(buildSubTaskError(req, "Проверьте данные подзадачи", "SUBTASK_INVALID_INPUT"));
    }
    const subTaskId = parseId(req.params.id);
    const requestResult = subTaskUpdateRequestSchema.safeParse(req.body);
    if (!subTaskId || !requestResult.success) {
      return res
        .status(400)
        .json(buildSubTaskError(req, "Проверьте данные подзадачи", "SUBTASK_INVALID_INPUT"));
    }
    const { title, completed, position } = requestResult.data;
    const uniqueSubTask = await db.subTask.findUnique({
      where: { id: subTaskId },
      include: { task: true },
    });
    if (!uniqueSubTask || uniqueSubTask.task.userId !== req.user.id) {
      return res
        .status(403)
        .json(buildSubTaskError(req, "Нет доступа к этой задаче", "SUBTASK_FORBIDDEN"));
    }
    const data: Prisma.SubTaskUncheckedUpdateInput = {};

    if (typeof title === "string") {
      data.title = title;
    }

    if (typeof completed === "boolean") {
      data.completed = completed;
    }

    if (Number.isInteger(position)) {
      data.position = position;
    }

    const updatedSubTask = await db.subTask.update({
      where: { id: subTaskId },
      data,
    });
    res.json(subTaskSchema.parse(updatedSubTask));
  } catch (e) {
    logger.error("subtasks.update.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildSubTaskError(req, "Ошибка при обновлении", "SUBTASK_UPDATE_FAILED"));
  }
};

const deleteSubTask: RequestHandler = async (req, res) => {
  try {
    const subTaskId = parseId(req.params.id);
    if (!subTaskId) {
      return res
        .status(400)
        .json(buildSubTaskError(req, "Некорректный ID подзадачи", "SUBTASK_INVALID_ID"));
    }
    const uniqueSubTask = await db.subTask.findUnique({
      where: { id: subTaskId },
      include: { task: true },
    });
    if (!uniqueSubTask || uniqueSubTask.task.userId !== req.user.id) {
      return res
        .status(403)
        .json(buildSubTaskError(req, "Нет доступа к этой задаче", "SUBTASK_FORBIDDEN"));
    }
    await db.subTask.delete({
      where: { id: subTaskId },
    });
    res.json(taskDeleteResponseSchema.parse({ message: "Удалено" }));
  } catch (e) {
    logger.error("subtasks.delete.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildSubTaskError(req, "Ошибка при удалении", "SUBTASK_DELETE_FAILED"));
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

return router;
};

export default createSubTaskRouter();
