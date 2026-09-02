import express from "express";
import type { Request, RequestHandler, Response, Router } from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import { body, validationResult } from "express-validator";
import {
  taskCreateRequestSchema,
  taskDeleteResponseSchema,
  taskUpdateRequestSchema,
  taskUpdateResponseSchema,
} from "@glowy/contracts";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { buildErrorEnvelope } from "../middleware/error.middleware.js";
import {
  createTaskForUser,
  TaskWriteError,
} from "../services/tasks/task-write.service.js";
import {
  serializeTaskContract,
  serializeTaskListContract,
} from "../services/tasks/task-contract.service.js";
import {
  buildUserProgress,
  buildCompletionXpOutcome,
  getLevelByXp,
  getXpReward,
  hasActiveOverdueTask,
  isTaskOverdueOn,
} from "../services/tasks/task-completion.service.js";
import {
  addDaysToDateOnly,
  isDateOnly,
  normalizeOptionalMinutes,
  parsePositiveId,
} from "../utils/validation.utils.js";

const taskInclude = {
  subtasks: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  },
  noteLinks: {
    include: {
      note: { select: { id: true, title: true, archived: true } },
    },
  },
} satisfies Prisma.TaskInclude;

const dateValidator = (value: unknown): boolean => {
  if (!value || isDateOnly(value)) return true;
  throw new Error("Некорректный формат даты. Используйте YYYY-MM-DD");
};

const minutesValidator = (value: unknown): boolean => {
  if (normalizeOptionalMinutes(value).valid) return true;
  throw new Error("Время должно быть целым числом от 1 до 1440 минут");
};

const buildTaskError = (req: Request, error: string, code: string) =>
  buildErrorEnvelope(req, error, code);

export const isAcceptableCompletionDate = (
  value: unknown,
  now = new Date()
): value is string => {
  if (!isDateOnly(value)) return false;

  // A local calendar day may already be tomorrow relative to UTC.
  const latestLocalDate = addDaysToDateOnly(now.toISOString().slice(0, 10), 1);
  return latestLocalDate !== null && value <= latestLocalDate;
};

export const createTaskRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  createTask = createTaskForUser,
}: {
  db?: PrismaClient;
  authenticate?: RequestHandler;
  createTask?: typeof createTaskForUser;
} = {}): Router => {
const router = express.Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const tasks = await db.task.findMany({
      where: { userId: req.user.id },
      include: taskInclude,
    });
    res.json(serializeTaskListContract(tasks));
  } catch (e) {
    logger.error("tasks.list.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildTaskError(req, "Не удалось загрузить задачи", "TASK_LIST_FAILED"));
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
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json(buildTaskError(req, "Проверьте данные задачи", "TASK_INVALID_INPUT"));
      }
      const requestResult = taskCreateRequestSchema.safeParse(req.body);
      if (!requestResult.success) {
        return res
          .status(400)
          .json(buildTaskError(req, "Проверьте данные задачи", "TASK_INVALID_INPUT"));
      }
      const newTask = await createTask({
        db,
        userId: req.user.id,
        input: requestResult.data,
        include: taskInclude,
      });

      return res.status(201).json(serializeTaskContract(newTask));
    } catch (e) {
      const status = e instanceof TaskWriteError ? e.status : 500;
      logger.error("tasks.create.failed", { req, error: e, statusCode: status });
      return res
        .status(status)
        .json(
          buildTaskError(
            req,
            e instanceof TaskWriteError ? e.message : "Ошибка при создании",
            e instanceof TaskWriteError ? "TASK_INVALID_INPUT" : "TASK_CREATE_FAILED"
          )
        );
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
  async (req: Request, res: Response) => {
    try {
      const taskId = parsePositiveId(req.params.id);
      if (!taskId) {
        return res
          .status(400)
          .json(buildTaskError(req, "Некорректный ID задачи", "TASK_INVALID_ID"));
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json(buildTaskError(req, "Проверьте данные задачи", "TASK_INVALID_INPUT"));
      }
      const requestResult = taskUpdateRequestSchema.safeParse(req.body);
      if (!requestResult.success) {
        return res
          .status(400)
          .json(buildTaskError(req, "Проверьте данные задачи", "TASK_INVALID_INPUT"));
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
      } = requestResult.data;
    const uniqueTask = await db.task.findUnique({
      where: { id: taskId },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res
        .status(403)
        .json(buildTaskError(req, "Нет доступа к этой задаче", "TASK_FORBIDDEN"));
    }

    const isCompleting = completed === true && !uniqueTask.completed;
    if (isCompleting && !isAcceptableCompletionDate(completedOn)) {
      return res.status(400).json(
        buildTaskError(
          req,
          "При выполнении задачи укажите текущую дату в формате YYYY-MM-DD",
          "TASK_COMPLETION_DATE_INVALID"
        )
      );
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

    const result = await db.$transaction(async (tx) => {
      let xpReward = 0;
      let xpOutcome = null;
      let updatedUser = null;
      const shouldAwardXp =
        completed === true && !uniqueTask.completed && !uniqueTask.xpAwarded;

      if (shouldAwardXp) {
        const completionDay =
          typeof nextCompletedOn === "string" ? nextCompletedOn : "";
        const reward = getXpReward(
          energyLevel ?? uniqueTask.energyLevel,
          priority ?? uniqueTask.priority
        );
        const user = await tx.user.findUnique({
          where: { id: req.user.id },
          select: { xp: true, aiTone: true },
        });
        const targetTask = {
          ...uniqueTask,
          date: date ?? uniqueTask.date,
        };
        const targetIsOverdue = isTaskOverdueOn(targetTask, completionDay);
        const hasOverdueBlocker = targetIsOverdue
          ? false
          : await hasActiveOverdueTask({
              db: tx,
              userId: req.user.id,
              excludeTaskId: taskId,
              referenceDay: completionDay,
            });
        xpOutcome = buildCompletionXpOutcome({
          aiTone: user?.aiTone,
          reward,
          currentXp: user?.xp ?? 0,
          hasOverdueBlocker,
          targetIsOverdue,
        });
        xpReward = xpOutcome.xpDelta;
        const nextXp = Math.max(0, (user?.xp ?? 0) + xpReward);

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
        xpOutcome,
        userProgress: updatedUser ? buildUserProgress(updatedUser) : null,
      };
    });

    res.json(
      taskUpdateResponseSchema.parse({
        ...result,
        task: serializeTaskContract(result.task),
      })
    );
  } catch (e) {
    logger.error("tasks.update.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildTaskError(req, "Ошибка при обновлении", "TASK_UPDATE_FAILED"));
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const taskId = parsePositiveId(req.params.id);
    if (!taskId) {
      return res
        .status(400)
        .json(buildTaskError(req, "Некорректный ID задачи", "TASK_INVALID_ID"));
    }

    const uniqueTask = await db.task.findUnique({
      where: { id: taskId },
    });
    if (!uniqueTask || uniqueTask.userId !== req.user.id) {
      return res
        .status(403)
        .json(buildTaskError(req, "Нет доступа к этой задаче", "TASK_FORBIDDEN"));
    }
    await db.task.delete({
      where: { id: taskId },
    });
    res.json(taskDeleteResponseSchema.parse({ message: "Удалено" }));
  } catch (e) {
    logger.error("tasks.delete.failed", { req, error: e, statusCode: 500 });
    res
      .status(500)
      .json(buildTaskError(req, "Ошибка при удалении", "TASK_DELETE_FAILED"));
  }
});

return router;
};

export default createTaskRouter();
