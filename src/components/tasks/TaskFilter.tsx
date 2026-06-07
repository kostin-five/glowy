import { useFilter, useSetFilter } from "../../store/useTaskStore";
import type { FilterStatus } from "../../types";

const TaskFilter = () => {
  const filterStatus = useFilter();
  const setFilterStatus = useSetFilter();
  const filterTypes: FilterStatus[] = ["Активные", "Выполненные", "Все"];

  return (
    <div className="flex h-full w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      {filterTypes.map((filter: FilterStatus) => (
        <button
          key={filter}
          onClick={() => setFilterStatus(filter)}
          className={`px-4 py-2 rounded-lg text-sm  transition-all duration-200 ${
            filter === filterStatus
              ? "font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm"
              : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          }
            `}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

export default TaskFilter;
