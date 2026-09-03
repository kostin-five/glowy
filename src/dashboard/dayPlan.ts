import type { EnergyLevel, Task } from "../types";

export type DayPlanCandidate = {
  task: Task;
  isToday: boolean;
  reason: string;
};

const getCapacity = (energy: number) => {
  if (energy <= 30) return 1;
  if (energy <= 70) return 2;
  return 3;
};

const getUrgencyRank = (date: string, today: string) => {
  if (!date) return 2;
  if (date < today) return 0;
  if (date === today) return 1;
  return 3;
};

const getEnergyPreference = (energy: number): EnergyLevel[] => {
  if (energy <= 30) return ["low", "med", "high"];
  if (energy <= 70) return ["med", "low", "high"];
  return ["high", "med", "low"];
};

const getPriorityRank = (priority: string) => {
  if (priority.includes("P1")) return 0;
  if (priority.includes("P2")) return 1;
  return 2;
};

const getDurationRank = (minutes: number | null | undefined, energy: number) => {
  if (minutes == null) return 2;
  if (energy <= 30) return minutes <= 30 ? 0 : 3;
  if (energy <= 70) {
    if (minutes >= 31 && minutes <= 60) return 0;
    return minutes <= 30 ? 1 : 3;
  }
  if (minutes >= 45) return 0;
  return minutes >= 31 ? 1 : 3;
};

const getReason = (task: Task, energy: number, today: string) => {
  if (task.date && task.date < today) {
    return "Срок уже прошёл — лучше снять напряжение первым шагом.";
  }
  if (task.date === today) {
    return "Уже запланировано на сегодня и подходит текущему заряду.";
  }
  if (energy <= 30 && task.estimatedMinutes != null && task.estimatedMinutes <= 30) {
    return "Короткая задача подходит текущему заряду.";
  }
  if (getEnergyPreference(energy)[0] === task.energyLevel) {
    return "Нагрузка подходит текущему заряду.";
  }
  if (task.priority.includes("P1")) {
    return "Высокий приоритет — полезно продвинуть задачу сегодня.";
  }
  return "Спокойный следующий шаг, который поможет продвинуть день.";
};

export const buildDayPlan = (
  tasks: Task[],
  currentEnergy: number,
  today: string
): DayPlanCandidate[] => {
  const energy = Math.max(0, Math.min(100, currentEnergy));
  const energyPreference = getEnergyPreference(energy);

  return tasks
    .filter((task) => !task.completed)
    .sort((a, b) => {
      const urgencyDiff = getUrgencyRank(a.date, today) - getUrgencyRank(b.date, today);
      if (urgencyDiff !== 0) return urgencyDiff;

      const energyDiff = energyPreference.indexOf(a.energyLevel) - energyPreference.indexOf(b.energyLevel);
      if (energyDiff !== 0) return energyDiff;

      const priorityDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
      if (priorityDiff !== 0) return priorityDiff;

      const durationDiff = getDurationRank(a.estimatedMinutes, energy) - getDurationRank(b.estimatedMinutes, energy);
      if (durationDiff !== 0) return durationDiff;

      const titleDiff = a.title.localeCompare(b.title, "ru");
      return titleDiff || a.id - b.id;
    })
    .slice(0, getCapacity(energy))
    .map((task) => ({
      task,
      isToday: task.date === today,
      reason: getReason(task, energy, today),
    }));
};
