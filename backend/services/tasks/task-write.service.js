import { prisma } from "../../lib/prisma.js";
import { isDateOnly, normalizeOptionalMinutes } from "../../utils/validation.utils.js";

const priorities = new Set(["🔥 P1", "⚡️ P2", "💤 P3"]);
const energyLevels = new Set(["low", "med", "high"]);

export const normalizeTaskWriteInput = (value = {}) => {
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const date = typeof value.date === "string" ? value.date : "";
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const priority = priorities.has(value.priority) ? value.priority : "⚡️ P2";
  const energyLevel = energyLevels.has(value.energyLevel) ? value.energyLevel : "med";
  const estimatedMinutes = normalizeOptionalMinutes(value.estimatedMinutes).value;
  const actualMinutes = normalizeOptionalMinutes(value.actualMinutes).value;

  if (!title || title.length > 255 || category.length > 100 || (date && !isDateOnly(date))) {
    return { error: "Проверьте данные задачи" };
  }

  const subtasks = Array.isArray(value.subtasks)
    ? value.subtasks
        .map((subtask, index) => ({
          title: typeof subtask?.title === "string" ? subtask.title.trim() : "",
          completed: Boolean(subtask?.completed),
          position: Number.isInteger(subtask?.position) ? subtask.position : index,
        }))
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

export const createTaskForUser = async ({
  db = prisma,
  userId,
  input,
  include,
} = {}) => {
  const normalized = normalizeTaskWriteInput(input);
  if (normalized.error) {
    const error = new Error(normalized.error);
    error.code = "INVALID_TASK_INPUT";
    error.status = 400;
    throw error;
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
