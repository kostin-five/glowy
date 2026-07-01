export type TaskGroup<T> = {
  key: string;
  label: string;
  tasks: T[];
};

export type TaskDateGroup<T> = TaskGroup<T> & {
  date: Date | null;
  isUndated: boolean;
};

export const groupTasks = <T extends { date?: string; priority?: string; energyLevel?: string; category?: string }>(
  tasks: T[],
  sortField: string | null,
  direction: "asc" | "desc"
): TaskGroup<T>[] | null => {
  if (sortField === "title" || !sortField) {
    return null;
  }

  if (sortField === "date") {
    return groupTasksByDate(tasks, direction) as TaskGroup<T>[];
  }

  const groups: Record<string, T[]> = {};
  const order: string[] = [];

  tasks.forEach((task) => {
    let key = "";

    if (sortField === "priority") {
      key = task.priority || "";
    } else if (sortField === "energy") {
      key = task.energyLevel || "low";
    } else if (sortField === "category") {
      key = task.category || "Без категории";
    }

    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(task);
  });

  // Sort keys
  if (sortField === "priority") {
    const pOrder: Record<string, number> = { "🔥 P1": 3, "⚡️ P2": 2, "💤 P3": 1 };
    order.sort((a, b) => (direction === "desc" ? pOrder[b] - pOrder[a] : pOrder[a] - pOrder[b]));
  } else if (sortField === "energy") {
    const eOrder: Record<string, number> = { "high": 3, "med": 2, "low": 1 };
    order.sort((a, b) => (direction === "desc" ? eOrder[b] - eOrder[a] : eOrder[a] - eOrder[b]));
  } else {
    order.sort((a, b) => (direction === "desc" ? b.localeCompare(a) : a.localeCompare(b)));
    // Move "Без категории" to end
    if (sortField === "category") {
      const index = order.indexOf("Без категории");
      if (index !== -1) {
        order.splice(index, 1);
        order.push("Без категории");
      }
    }
  }

  return order.map((key) => ({
    key,
    label: getLabelForField(key, sortField),
    tasks: groups[key],
  }));
};

const getLabelForField = (key: string, field: string): string => {
  if (field === "priority") {
    if (key.includes("P1")) return "Высокий приоритет";
    if (key.includes("P2")) return "Средний приоритет";
    return "Низкий приоритет";
  }
  if (field === "energy") {
    if (key === "high") return "Высокая энергия";
    if (key === "med") return "Средняя энергия";
    return "Низкая энергия";
  }
  return key;
};

export const normalizeTaskDate = (input?: string | null): string => {
  if (!input) return "";
  const trimmed = input.trim();

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    if (isValidDate(parseInt(y), parseInt(m), parseInt(d))) return trimmed;
  }

  // DD.MM.YYYY or D.M.YYYY
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (isValidDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return "";
};

const isValidDate = (y: number, m: number, d: number): boolean => {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

export const parseTaskDateToLocalDay = (date?: string): Date | null => {
  const normalized = normalizeTaskDate(date);
  if (!normalized) return null;
  const [y, m, d] = normalized.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const getTodayTaskDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const formatTaskDateGroupLabel = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  if (compareDate.getTime() === today.getTime()) return "Сегодня";
  if (compareDate.getTime() === tomorrow.getTime()) return "Завтра";
  if (compareDate.getTime() === yesterday.getTime()) return "Вчера";

  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  if (year === today.getFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${year}`;
};

export const formatTaskDateForUI = (dateStr?: string): string => {
  if (!dateStr) return "Без даты";

  const date = parseTaskDateToLocalDay(dateStr);
  if (!date) return "Без даты";

  return formatTaskDateGroupLabel(date);
};

export const groupTasksByDate = <T extends { date?: string }>(
  tasks: T[],
  direction: "asc" | "desc" = "asc"
): TaskDateGroup<T>[] => {
  const groups: Record<string, T[]> = {};
  const undated: T[] = [];

  tasks.forEach((task) => {
    const dateObj = parseTaskDateToLocalDay(task.date);
    if (!dateObj) {
      undated.push(task);
    } else {
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }
  });

  const result: TaskDateGroup<T>[] = Object.keys(groups)
    .sort((a, b) => {
      const [y1, m1, d1] = a.split("-").map(Number);
      const [y2, m2, d2] = b.split("-").map(Number);
      const time1 = new Date(y1, m1 - 1, d1).getTime();
      const time2 = new Date(y2, m2 - 1, d2).getTime();
      return direction === "asc" ? time1 - time2 : time2 - time1;
    })
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return {
        key,
        label: formatTaskDateGroupLabel(date),
        date,
        tasks: groups[key],
        isUndated: false,
      };
    });

  if (undated.length > 0) {
    result.push({
      key: "undated",
      label: "Без даты",
      date: null,
      tasks: undated,
      isUndated: true,
    });
  }

  return result;
};
