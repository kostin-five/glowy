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
    <div className="flex flex-col gap-4">
      <div className="w-full">
        <TaskFilter />
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
        <div className="relative flex-1">
          <span className="sr-only">Поиск задач</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Найти задачу..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-9 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500"
          />
        </div>

        <div className="w-full md:w-auto shrink-0">
          <SortMenu />
        </div>

        <div className="hidden md:flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none shrink-0">
          {viewOptions.map(({ mode, label, icon: Icon }) => {
            const isActive = taskViewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setTaskViewMode(mode)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-500 shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
                aria-label={label}
                aria-pressed={isActive}
                title={label}
              >
                <Icon size={16} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-indigo-500 text-white transition-all hover:bg-indigo-600 active:scale-95 md:bottom-8 md:right-8"
        onClick={onCreateClick}
        aria-label="Добавить задачу"
      >
        <span className="text-2xl font-medium">+</span>
      </button>
    </div>
  );
};

export default TaskControls;
