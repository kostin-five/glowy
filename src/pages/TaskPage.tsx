import { useState } from "react";
import CreateTaskForm from "../components/tasks/CreateTaskModal";
import TaskControls from "../components/tasks/TaskControls";
import TaskList from "../components/tasks/TaskList";

const TaskPage = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);

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
