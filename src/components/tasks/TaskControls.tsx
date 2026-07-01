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
  isBulkSelectMode: boolean;
  setIsBulkSelectMode: (v: boolean) => void;
}

const TaskControls = ({ onCreateClick, isBulkSelectMode, setIsBulkSelectMode }: TaskControlsProps) => {
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <TaskFilter />
        </div>
        
        <button
          type="button"
          onClick={() => setIsBulkSelectMode(!isBulkSelectMode)}
          className={`hidden h-10 shrink-0 rounded-xl px-4 text-sm font-medium transition-all md:inline-flex md:items-center ${
            isBulkSelectMode
              ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {isBulkSelectMode ? "Отмена" : "Выбрать"}
        </button>
      </div>

      <div className="grid w-full min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div className="relative min-w-0">
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

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <SortMenu />
          </div>
          
          <button
            type="button"
            onClick={() => setIsBulkSelectMode(!isBulkSelectMode)}
            className={`md:hidden h-10 px-4 rounded-xl text-sm font-medium transition-all ${
              isBulkSelectMode
                ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                : "bg-white border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-300"
            }`}
          >
            {isBulkSelectMode ? "Отмена" : "Выбрать"}
          </button>
        </div>

        <div
          className="hidden md:flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none shrink-0"
          aria-label="Режим отображения задач"
        >
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
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-white transition-all hover:bg-indigo-600 active:scale-95 md:h-16 md:w-16 md:right-8 lg:bottom-8"
        onClick={onCreateClick}
        aria-label="Добавить задачу"
      >
        <span className="text-2xl font-medium">+</span>
      </button>
    </div>
  );
};

export default TaskControls;
