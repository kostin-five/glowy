import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CreateTaskForm from "../components/tasks/CreateTaskModal";
import TaskControls from "../components/tasks/TaskControls";
import TaskList from "../components/tasks/TaskList";

const TaskPage = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
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
    <div className="flex flex-col gap-8 px-4 md:px-8 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl font-bold text-slate-950 dark:text-slate-100">
        Твои задачи
      </h1>
      <TaskControls 
        onCreateClick={() => setIsCreateOpen(true)} 
        isBulkSelectMode={isBulkSelectMode} 
        setIsBulkSelectMode={setIsBulkSelectMode} 
      />
      <TaskList 
        onEmptyClick={() => setIsCreateOpen(true)} 
        groupByDate 
        isBulkSelectMode={isBulkSelectMode}
        setIsBulkSelectMode={setIsBulkSelectMode}
      />

      {isCreateOpen && (
        <CreateTaskForm
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
};

export default TaskPage;
