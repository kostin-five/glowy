export const taskInclude = {
  subtasks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }] },
};

export const normalizeTaskSubtasks = (subtasks) =>
  Array.isArray(subtasks)
    ? subtasks.map((subtask, position) => ({
        title: typeof subtask?.title === "string" ? subtask.title.trim() : "",
        completed: Boolean(subtask?.completed),
        position: Number.isInteger(subtask?.position) ? subtask.position : position,
      })).filter((subtask) => subtask.title.length > 0)
    : [];

export const createTaskForUser = async (db, userId, payload) => {
  const subtasks = normalizeTaskSubtasks(payload.subtasks);
  return db.task.create({
    data: {
      title: payload.title,
      energyLevel: payload.energyLevel,
      category: payload.category,
      date: payload.date,
      priority: payload.priority,
      completed: false,
      userId,
      subtasks: subtasks.length ? { create: subtasks } : undefined,
    },
    include: taskInclude,
  });
};
