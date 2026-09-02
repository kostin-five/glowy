import type {
  TaskFormMode,
  TaskFormPreferences,
} from "../../store/useSettingsStore";

export interface TaskFormSections {
  details: boolean;
  date: boolean;
  priority: boolean;
  energy: boolean;
  estimatedMinutes: boolean;
  actualMinutes: boolean;
  category: boolean;
  subtasks: boolean;
}

export const getTaskFormSections = (
  mode: TaskFormMode,
  preferences: TaskFormPreferences,
  detailsExpanded = false
): TaskFormSections => {
  const details = mode !== "compact" || detailsExpanded;

  return {
    details,
    date: details,
    priority: details && preferences.fields.priority,
    energy: details && preferences.fields.energy,
    estimatedMinutes: details,
    actualMinutes: mode === "full" || (mode === "compact" && detailsExpanded),
    category: details,
    subtasks: mode === "full" || (mode === "compact" && detailsExpanded),
  };
};
