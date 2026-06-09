import { LayoutGrid, List, Search, type LucideIcon } from "lucide-react";
import SortMenu from "../ui/SortMenu";
import TaskFilter from "./TaskFilter";
import {
  useSearchQuery,
  useSetSearchQuery,
} from "../../store/useTaskStore";
import {
  useSetTaskViewMode,
  useTaskViewMode,
  type TaskViewMode,
} from "../../store/useSettingsStore";

interface TaskControlsProps {
  onCreateClick: () => void;
}

const TaskControls = ({ onCreateClick }: TaskControlsProps) => {
  const searchQuery = useSearchQuery();
  const setSearchQuery = useSetSearchQuery();
  const taskViewMode = useTaskViewMode();
  const setTaskViewMode = useSetTaskViewMode();
  const viewOptions: Array<{
    mode: TaskViewMode;
    label: string;
    icon: LucideIcon;
  }> = [
    { mode: "list", label: "Список", icon: List },
    { mode: "grid", label: "Квадратики", icon: LayoutGrid },
  ];

  return (
    <div className="mb-6 flex flex-col justify-between gap-4">
      <label className="relative w-full">
        <span className="sr-only">Поиск задач</span>
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Найти задачу по названию..."
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500"
        />
      </label>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center h-11.5">
            <TaskFilter />
          </div>

          <div className="flex items-center h-11.5">
            <SortMenu />
          </div>

          <div
            className="flex h-11.5 w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none"
            aria-label="Режим отображения задач"
          >
            {viewOptions.map(({ mode, label, icon: Icon }) => {
              const isActive = taskViewMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTaskViewMode(mode)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    isActive
                      ? "border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  }`}
                  aria-label={label}
                  aria-pressed={isActive}
                  title={label}
                >
                  <Icon size={18} strokeWidth={2.3} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="flex h-11.5 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600 active:scale-95"
          onClick={onCreateClick}
        >
          Добавить задачу +
        </button>
      </div>
    </div>
  );
};

export default TaskControls;
