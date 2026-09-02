import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";
import { isDateOnly, normalizeOptionalMinutes } from "../../utils/validation.utils.js";
import { isUnknownRecord } from "../../types/boundaries.js";

const priorities = new Set(["🔥 P1", "⚡️ P2", "💤 P3"]);
const energyLevels = new Set(["low", "med", "high"]);

interface NormalizedSubtask {
  title: string;
  completed: boolean;
  position: number;
}

interface NormalizedTaskWriteData {
  title: string;
  date: string;
  category: string;
  priority: string;
  energyLevel: string;
  completed: false;
  completedOn: null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  subtasks: NormalizedSubtask[];
}

type NormalizedTaskWriteResult =
  | { error: string; data?: never }
  | { data: NormalizedTaskWriteData; error?: never };

export const normalizeTaskWriteInput = (
  input: unknown = {}
): NormalizedTaskWriteResult => {
  const value = isUnknownRecord(input) ? input : {};
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const date = typeof value.date === "string" ? value.date : "";
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const priority =
    typeof value.priority === "string" && priorities.has(value.priority)
      ? value.priority
      : "⚡️ P2";
  const energyLevel =
    typeof value.energyLevel === "string" && energyLevels.has(value.energyLevel)
      ? value.energyLevel
      : "med";
  const estimatedMinutes = normalizeOptionalMinutes(value.estimatedMinutes).value;
  const actualMinutes = normalizeOptionalMinutes(value.actualMinutes).value;

  if (!title || title.length > 255 || category.length > 100 || (date && !isDateOnly(date))) {
    return { error: "Проверьте данные задачи" };
  }

  const subtasks = Array.isArray(value.subtasks)
    ? value.subtasks
        .map((rawSubtask, index) => {
          const subtask = isUnknownRecord(rawSubtask) ? rawSubtask : {};
          return {
            title: typeof subtask.title === "string" ? subtask.title.trim() : "",
            completed: Boolean(subtask.completed),
            position:
              typeof subtask.position === "number" && Number.isInteger(subtask.position)
                ? subtask.position
                : index,
          };
        })
        .filter((subtask) => subtask.title)
    : [];

  return {
    data: {
      title,
      date,
      category,
      priority,
      energyLevel,
      completed: false,
      completedOn: null,
      estimatedMinutes: estimatedMinutes ?? null,
      actualMinutes: actualMinutes ?? null,
      subtasks,
    },
  };
};

export class TaskWriteError extends Error {
  readonly code = "INVALID_TASK_INPUT";
  readonly status = 400;
}

interface TaskCreateDb {
  task: {
    create(args: Prisma.TaskCreateArgs): PromiseLike<unknown>;
  };
}

export const createTaskForUser = async ({
  db = prisma,
  userId,
  input,
  include,
}: {
  db?: TaskCreateDb;
  userId: number;
  input: unknown;
  include?: Prisma.TaskInclude;
}): Promise<unknown> => {
  const normalized = normalizeTaskWriteInput(input);
  if ("error" in normalized) {
    throw new TaskWriteError(normalized.error);
  }

  const { subtasks, ...task } = normalized.data;
  return db.task.create({
    data: {
      ...task,
      userId,
      subtasks: subtasks.length ? { create: subtasks } : undefined,
    },
    include,
  });
};

export default createTaskForUser;
