export type TaskDateGroup<T> = {
  key: string;
  label: string;
  date: Date | null;
  tasks: T[];
  isUndated: boolean;
};

export const normalizeTaskDate = (input?: string | null): string => {
  if (!input) return "";

  // YYYY-MM-DD
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return input;

  // DD.MM.YYYY
  const dotMatch = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m}-${d}`;
  }

  return "";
};

export const getTodayTaskDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const parseTaskDateToLocalDay = (date?: string): Date | null => {
  const normalizedDate = normalizeTaskDate(date);
  if (!normalizedDate) return null;

  const [year, month, day] = normalizedDate.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  ) {
    return dateObj;
  }

  return null;
};

export const formatTaskDateForUI = (dateStr?: string): string => {
  if (!dateStr) return "Без даты";

  const date = parseTaskDateToLocalDay(dateStr);
  if (!date) return "Без даты";

  return formatTaskDateGroupLabel(date);
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

export const groupTasksByDate = <T extends { date?: string }>(tasks: T[]): TaskDateGroup<T>[] => {
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
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
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
