import { useFilter, useSetFilter, type FilterStatus } from "../../store/useTaskStore";

const TaskFilter = () => {
  const filterStatus = useFilter();
  const setFilterStatus = useSetFilter();
  const filterTypes: FilterStatus[] = ["Все", "Активные", "Выполненные"];

  return (
    <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl w-fit border border-slate-800 h-full">
      {filterTypes.map((filter: FilterStatus) => (
        <button
          key={filter}
          onClick={() => setFilterStatus(filter)}
          className={`px-4 py-2 rounded-lg text-sm  transition-all duration-200 ${
            filter === filterStatus
              ? "font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm"
              : "font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
