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
  const dates = [...streakSet].sort((left, right) => right.localeCompare(left));

  for (const date of dates) {
    const candidate = addDaysToDateOnly(date, -1);
    const before = addDaysToDateOnly(candidate, -1);
    if (
      candidate &&
      candidate < today &&
      !streakSet.has(candidate) &&
      before &&
      streakSet.has(before)
    ) {
      return candidate;
    }
  }

  return null;
};

export const calculateHabitStreak = (checkDates, today) =>
  calculateStreak({ activeDates: checkDates, today }).current;

export const getMonthPrefix = (date) =>
  isDateOnly(date) ? date.slice(0, 7) : null;
