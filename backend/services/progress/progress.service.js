import { addDaysToDateOnly, isDateOnly } from "../../utils/validation.utils.js";

const uniqueSortedDates = (dates) =>
  [...new Set(dates.filter(isDateOnly))].sort((left, right) =>
    left.localeCompare(right)
  );

export const calculateStreak = ({ activeDates, rescueDates = [], today }) => {
  if (!isDateOnly(today)) {
    throw new Error("Некорректная текущая дата");
  }

  const activity = uniqueSortedDates(activeDates);
  const protectedDates = uniqueSortedDates(rescueDates);
  const activeSet = new Set(activity);
  const streakSet = new Set([...activity, ...protectedDates]);
  const lastActiveOn = activity.at(-1) ?? null;

  let cursor = today;
  if (!streakSet.has(cursor)) cursor = addDaysToDateOnly(cursor, -1);

  let current = 0;
  while (cursor && streakSet.has(cursor)) {
    current += 1;
    cursor = addDaysToDateOnly(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let previous = null;
  for (const date of uniqueSortedDates([...activity, ...protectedDates])) {
    run = previous && addDaysToDateOnly(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return { current, longest, lastActiveOn, activeSet, streakSet };
};

export const findRescueEligibleDate = ({
  activeDates,
  rescueDates = [],
  today,
}) => {
  const { streakSet } = calculateStreak({ activeDates, rescueDates, today });
  const candidate = addDaysToDateOnly(today, -1);
  const before = addDaysToDateOnly(today, -2);

  return !streakSet.has(candidate) && streakSet.has(before) ? candidate : null;
};

export const calculateHabitStreak = (checkDates, today) =>
  calculateStreak({ activeDates: checkDates, today }).current;

export const getMonthPrefix = (date) =>
  isDateOnly(date) ? date.slice(0, 7) : null;

export const isMonthOnly = (value) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) return false;
  return new Date(`${value}-01T00:00:00.000Z`).toISOString().slice(0, 7) === value;
};

const getMonthEnd = (month) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
};

const getMonday = (dateOnly) => {
  const day = new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay();
  return addDaysToDateOnly(dateOnly, -(day === 0 ? 6 : day - 1));
};

const getSunday = (dateOnly) => {
  const day = new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay();
  return addDaysToDateOnly(dateOnly, day === 0 ? 0 : 7 - day);
};

export const buildRhythmCalendar = ({
  month,
  today,
  activeDates,
  rescueDates = [],
  accountCreatedOn,
}) => {
  if (!isMonthOnly(month) || !isDateOnly(today)) {
    throw new Error("Некорректный календарный месяц");
  }

  const monthStart = `${month}-01`;
  const from = getMonday(monthStart);
  const to = getSunday(getMonthEnd(month));
  const active = new Set(uniqueSortedDates(activeDates));
  const rescued = new Set(uniqueSortedDates(rescueDates));
  const days = [];

  for (let date = from; date <= to; date = addDaysToDateOnly(date, 1)) {
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
