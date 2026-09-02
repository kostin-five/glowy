import type { TaskFormMode } from "../../store/useSettingsStore";

const taskFormModeOptions: ReadonlyArray<{
  value: TaskFormMode;
  label: string;
  description: string;
}> = [
  { value: "compact", label: "Коротко", description: "Только название" },
  { value: "medium", label: "Средне", description: "Основные поля" },
  { value: "full", label: "Полно", description: "Все детали" },
];

interface TaskFormModeControlProps {
  mode: TaskFormMode;
  onChange: (mode: TaskFormMode) => void;
}

const TaskFormModeControl = ({ mode, onChange }: TaskFormModeControlProps) => (
  <fieldset>
    <legend className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
      Подробность задачи
    </legend>
    <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950/60">
      {taskFormModeOptions.map((option) => {
        const isActive = option.value === mode;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            title={option.description}
            className={`min-h-10 rounded-lg px-2 py-2 text-xs font-bold transition-colors sm:text-sm ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </fieldset>
);

export default TaskFormModeControl;
