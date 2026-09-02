import { addDaysToDateOnly, isDateOnly } from "../../utils/validation.utils.js";

const shiftDate = (date: string, days: number): string => {
  const shifted = addDaysToDateOnly(date, days);
  if (!shifted) throw new Error("Некорректная дата");
  return shifted;
};

const uniqueSortedDates = (dates: unknown[]): string[] =>
  [...new Set(dates.filter(isDateOnly))].sort((left, right) =>
    left.localeCompare(right)
  );

interface StreakInput {
  activeDates: unknown[];
  rescueDates?: unknown[];
  today: string;
}

export const calculateStreak = ({
  activeDates,
  rescueDates = [],
  today,
}: StreakInput) => {
  if (!isDateOnly(today)) {
    throw new Error("Некорректная текущая дата");
  }

  const activity = uniqueSortedDates(activeDates);
  const protectedDates = uniqueSortedDates(rescueDates);
  const activeSet = new Set(activity);
  const streakSet = new Set([...activity, ...protectedDates]);
  const lastActiveOn = activity.at(-1) ?? null;

  let cursor = today;
  if (!streakSet.has(cursor)) cursor = shiftDate(cursor, -1);

  let current = 0;
  while (cursor && streakSet.has(cursor)) {
    current += 1;
    cursor = shiftDate(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of uniqueSortedDates([...activity, ...protectedDates])) {
    run = previous && shiftDate(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return { current, longest, lastActiveOn, activeSet, streakSet };
};

export const findRescueEligibleDate = ({
  activeDates,
  rescueDates = [],
  today,
}: StreakInput): string | null => {
  const { streakSet } = calculateStreak({ activeDates, rescueDates, today });
  const candidate = shiftDate(today, -1);
  const before = shiftDate(today, -2);

  return !streakSet.has(candidate) && streakSet.has(before) ? candidate : null;
};

export const calculateHabitStreak = (checkDates: unknown[], today: string): number =>
  calculateStreak({ activeDates: checkDates, today }).current;

export const getMonthPrefix = (date: unknown): string | null =>
  isDateOnly(date) ? date.slice(0, 7) : null;

export const isMonthOnly = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return false;
  }
  return new Date(`${value}-01T00:00:00.000Z`).toISOString().slice(0, 7) === value;
};

const getMonthEnd = (month: string): string => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
};

const getMonday = (dateOnly: string): string => {
  const day = new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay();
  return shiftDate(dateOnly, -(day === 0 ? 6 : day - 1));
};

const getSunday = (dateOnly: string): string => {
  const day = new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay();
  return shiftDate(dateOnly, day === 0 ? 0 : 7 - day);
};

interface RhythmCalendarInput {
  month: string;
  today: string;
  activeDates: unknown[];
  rescueDates?: unknown[];
  accountCreatedOn?: string | null;
}

export const buildRhythmCalendar = ({
  month,
  today,
  activeDates,
  rescueDates = [],
  accountCreatedOn,
}: RhythmCalendarInput) => {
  if (!isMonthOnly(month) || !isDateOnly(today)) {
    throw new Error("Некорректный календарный месяц");
  }

  const monthStart = `${month}-01`;
  const from = getMonday(monthStart);
  const to = getSunday(getMonthEnd(month));
  const active = new Set(uniqueSortedDates(activeDates));
  const rescued = new Set(uniqueSortedDates(rescueDates));
  const days: Array<{
    date: string;
    inMonth: boolean;
    state: "active" | "rescued" | "today" | "future" | "empty" | "missed";
  }> = [];

  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    const state = active.has(date)
      ? "active"
      : rescued.has(date)
        ? "rescued"
        : date === today
          ? "today"
          : date > today
            ? "future"
            : accountCreatedOn && date < accountCreatedOn
              ? "empty"
              : "missed";
    days.push({ date, inMonth: date.startsWith(month), state });
  }

  return {
    month,
    from,
    to,
    canGoPrevious: !accountCreatedOn || month > accountCreatedOn.slice(0, 7),
    canGoNext: month < today.slice(0, 7),
    days,
  };
};
