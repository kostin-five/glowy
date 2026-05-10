import { useState } from "react";
import SortMenu from "../ui/SortMenu";
import TaskFilter from "./TaskFilter";
import CreateTaskForm from "./CreateTaskModal";

const TaskControls = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex items-center h-11.5">
          <SortMenu />
        </div>

        <div className="flex items-center h-11.5">
          <TaskFilter />
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 whitespace-nowrap h-11.5"
        onClick={() => setIsCreateOpen(true)}
      >
        Добавить задачу +
      </button>

      {isCreateOpen && (
        <CreateTaskForm
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
};

export default TaskControls;
