import { z } from "zod";
import { buildRhythmCalendar, calculateHabitStreak, calculateStreak, findRescueEligibleDate, isMonthOnly } from "../../backend/services/progress/progress.service";
import { ACHIEVEMENT_CATALOG } from "../../backend/services/progress/achievements.service";
import { addDaysToDateOnly, isDateOnly } from "../../backend/utils/validation.utils";
import { schemaProgressOverview, schemaAnalyticsSnapshot, type Habit, type Task } from "../types";
import { getLevelThreshold } from "../utils/xp";
import { demoTransaction, type DemoData } from "./demoStorage";

const assertDate = (date: string) => { if (!isDateOnly(date)) throw new Error("Укажи дату в формате YYYY-MM-DD"); };
const titleSchema = z.string().trim().min(1).max(120);
const summarize = (habit: Habit, today: string): Habit => ({ ...habit, checkedToday: habit.checkDates.includes(today), currentStreak: calculateHabitStreak(habit.checkDates, today) });
const findHabit = (data: DemoData, id: number) => {
  const habit = data.habits.find((item) => item.id === id);
  if (!habit) throw new Error("Привычка не найдена");
  return habit;
};
export interface DemoTaskState { tasks: Task[]; currentXP: number; userLevel: number }
const activeDates = (state: DemoTaskState) => state.tasks.filter((task) => task.completed && isDateOnly(task.completedOn)).map((task) => task.completedOn!);
const overview = (data: DemoData, state: DemoTaskState, today: string, month: string) => {
  assertDate(today);
  if (!isMonthOnly(month) || month > today.slice(0, 7)) throw new Error("Некорректный месяц");
  const dates = activeDates(state);
  const streak = calculateStreak({ activeDates: dates, rescueDates: data.rescues, today });
  const habits = data.habits.map((habit) => summarize(habit, today));
  const metrics = { tasks: dates.length, streak: streak.current, habits: habits.length, habitStreak: Math.max(0, ...habits.map((habit) => habit.currentStreak)) };
  const achievements = ACHIEVEMENT_CATALOG.map((item, index) => {
    if (!data.awards[item.key] && metrics[item.metric] >= item.target) data.awards[item.key] = new Date().toISOString();
    const earnedAt = data.awards[item.key] ?? null;
    return { ...item, id: earnedAt ? index + 1 : null, earnedAt, earned: Boolean(earnedAt), current: Math.min(item.target, metrics[item.metric]) };
  });
  const usedDates = data.rescues.filter((date) => date.startsWith(today.slice(0, 7)));
  return schemaProgressOverview.parse({
    xp: { current: state.currentXP, level: state.userLevel, nextLevelAt: getLevelThreshold(state.userLevel + 1) },
    taskStreak: { current: streak.current, longest: streak.longest, lastActiveOn: streak.lastActiveOn, days: streak.current ? [...streak.streakSet].sort().slice(-streak.current) : [], missedDateEligibleForRescue: findRescueEligibleDate({ activeDates: dates, rescueDates: data.rescues, today }), calendar: buildRhythmCalendar({ month, today, activeDates: dates, rescueDates: data.rescues }) },
    rescues: { remaining: Math.max(0, 3 - usedDates.length), monthlyLimit: 3, usedDates }, habits, achievements,
    // Local presentation flag only, never an account entitlement or plan.
    canUseFocusFeatures: true,
  });
};

export const DemoProgress = {
  overview: (state: DemoTaskState, today: string, month = today.slice(0, 7)) => demoTransaction((data) => overview(data, state, today, month)),
  createHabit: (title: string, today: string) => demoTransaction((data) => {
    assertDate(today);
    const timestamp = new Date().toISOString();
    const habit: Habit = { id: data.nextId++, title: titleSchema.parse(title), archived: false, checkedToday: false, checkDates: [], currentStreak: 0, createdAt: timestamp, updatedAt: timestamp };
    data.habits.push(habit); return habit;
  }),
  updateHabit: (id: number, patch: { title?: string; archived?: boolean }, today: string) => demoTransaction((data) => {
    assertDate(today); const habit = findHabit(data, id);
    if (patch.title !== undefined) habit.title = titleSchema.parse(patch.title);
    if (patch.archived !== undefined) habit.archived = patch.archived;
    habit.updatedAt = new Date().toISOString(); return summarize(habit, today);
  }),
  deleteHabit: (id: number) => demoTransaction((data) => { findHabit(data, id); data.habits = data.habits.filter((habit) => habit.id !== id); }),
  checkHabit: (id: number, date: string, completed: boolean, today: string) => demoTransaction((data) => {
    assertDate(date); assertDate(today); const habit = findHabit(data, id);
    if (completed && habit.archived) throw new Error("Восстанови привычку из архива");
    habit.checkDates = completed ? [...new Set([...habit.checkDates, date])].sort() : habit.checkDates.filter((item) => item !== date);
    habit.updatedAt = new Date().toISOString(); return summarize(habit, today);
  }),
  rescue: (state: DemoTaskState, date: string, today: string, month = today.slice(0, 7)) => demoTransaction((data) => {
    assertDate(today); assertDate(date);
    if (date !== addDaysToDateOnly(today, -1)) throw new Error("Спасательный круг защищает только вчерашний день");
    if (data.rescues.includes(date)) throw new Error("Этот день уже защищён");
    if (findRescueEligibleDate({ activeDates: activeDates(state), rescueDates: data.rescues, today }) !== date) throw new Error("Этот день не подходит для спасательного круга");
    if (data.rescues.filter((item) => item.startsWith(date.slice(0, 7))).length >= 3) throw new Error("В этом месяце спасательные круги закончились");
    data.rescues.push(date); return overview(data, state, today, month);
  }),
  analytics: (state: DemoTaskState, kind: "week" | "month", anchor: string) => demoTransaction((data) => {
    assertDate(anchor);
    const start = new Date(`${anchor}T00:00:00Z`);
    const weekday = start.getUTCDay();
    const from = kind === "week" ? addDaysToDateOnly(anchor, -(weekday === 0 ? 6 : weekday - 1))! : `${anchor.slice(0, 7)}-01`;
    const to = kind === "week" ? addDaysToDateOnly(from, 6)! : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const completed = state.tasks.filter((task) => task.completed && isDateOnly(task.completedOn) && task.completedOn >= from && task.completedOn <= to);
    const days = [];
    for (let date = from; date <= to; date = addDaysToDateOnly(date, 1)!) days.push({ date, completedTasks: completed.filter((task) => task.completedOn === date).length });
    const estimates = completed.filter((task) => Number.isInteger(task.estimatedMinutes) && Number(task.estimatedMinutes) > 0);
    const actuals = completed.filter((task) => Number.isInteger(task.actualMinutes) && Number(task.actualMinutes) > 0);
    return schemaAnalyticsSnapshot.parse({ period: { kind, from, to }, completedTasks: completed.length, dailyCompleted: days,
      energyDistribution: { low: completed.filter((task) => task.energyLevel === "low").length, med: completed.filter((task) => task.energyLevel === "med").length, high: completed.filter((task) => task.energyLevel === "high").length },
      taskStreak: calculateStreak({ activeDates: activeDates(state), rescueDates: data.rescues, today: anchor }).current,
      time: { estimatedMinutes: estimates.reduce((sum, task) => sum + task.estimatedMinutes!, 0), actualMinutes: actuals.reduce((sum, task) => sum + task.actualMinutes!, 0), tasksWithEstimate: estimates.length, tasksWithActual: actuals.length },
      hasActivity: completed.length > 0, canUseFocusFeatures: true, focusBetaAvailable: false, focusBetaEnabled: false, canRequestAiInsight: false,
    });
  }, false),
};
