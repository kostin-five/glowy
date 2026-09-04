import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TaskControls from "../components/tasks/TaskControls";
import TaskList from "../components/tasks/TaskList";
import { openTaskCreateLauncher } from "../components/tasks/taskCreateLauncher";
import { EMPTY_TASK_ADVANCED_FILTERS, type TaskAdvancedFilterState } from "../utils/taskAdvancedFilters";

const TaskPage = () => {
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<TaskAdvancedFilterState>(EMPTY_TASK_ADVANCED_FILTERS);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const taskId = Number(searchParams.get("task"));
    if (!Number.isInteger(taskId) || taskId <= 0) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`task-${taskId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-0 sm:px-2 md:gap-8 md:px-8">
      <h1 className="whitespace-nowrap font-display text-[clamp(1.65rem,9vw,1.875rem)] font-bold text-slate-950 dark:text-slate-100">
        Твои задачи
      </h1>
      <TaskControls 
        onCreateClick={openTaskCreateLauncher}
        isBulkSelectMode={isBulkSelectMode} 
        setIsBulkSelectMode={setIsBulkSelectMode} 
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
      />
      <TaskList 
        onEmptyClick={openTaskCreateLauncher}
        groupByDate 
        isBulkSelectMode={isBulkSelectMode}
        setIsBulkSelectMode={setIsBulkSelectMode}
        advancedFilters={advancedFilters}
      />

    </div>
  );
};

export default TaskPage;
