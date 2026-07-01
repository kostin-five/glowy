import { useFilter, useSetFilter } from "../../store/useTaskStore";
import type { FilterStatus } from "../../types";

const TaskFilter = () => {
  const filterStatus = useFilter();
  const setFilterStatus = useSetFilter();
  const filterTypes: FilterStatus[] = ["Активные", "Выполненные", "Все"];

  return (
    <div className="flex h-full w-full min-w-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      {filterTypes.map((filter: FilterStatus) => (
        <button
          key={filter}
          onClick={() => setFilterStatus(filter)}
          className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 sm:text-sm ${
            filter === filterStatus
              ? "border border-indigo-500/20 bg-indigo-500/10 font-semibold text-indigo-500 shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span className="block truncate">{filter}</span>
        </button>
      ))}
    </div>
  );
};

export default TaskFilter;
