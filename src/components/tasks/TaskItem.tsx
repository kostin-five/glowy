import { useState } from "react";
import type { Task } from "../../types";
import EditTaskModal from "./EditTaskModal";
import { motion } from "framer-motion";

const TaskItem = ({
  task,
  toggle,
}: {
  task: Task;
  toggle: (id: number) => void;
}) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const editTask = () => {
    setIsEditOpen(true);
  };

  const contentStyles = task.completed
    ? "line-through text-slate-500 opacity-50"
    : "text-slate-200";

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
      className={`flex flex-wrap justify-between sm:items-center gap-x-4 gap-y-3 border-l-4 ${
        task.energyLevel === "high"
          ? "bg-red-500/20 border-l-red-500"
          : task.energyLevel === "med"
          ? "bg-yellow-500/20 border-l-yellow-500"
          : "bg-green-500/30 border-l-green-500"
      } p-4 rounded-xl mb-3 hover:bg-slate-800/60 transition-colors`}
    >
      <label className="flex items-center gap-4 cursor-pointer group w-full sm:w-auto flex-1 min-w-50">
        <input
          className="hidden peer"
          type="checkbox"
          checked={task.completed}
          onChange={() => toggle(task.id)}
        />
        <div className="w-5 h-5 shrink-0 border-2 border-slate-500 rounded-md peer-checked:bg-indigo-500 peer-checked:border-indigo-500 flex items-center justify-center transition-colors">
          <svg
            className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span
            className={`font-medium transition-all duration-300 block truncate ${contentStyles}`}
          >
            {task.title}
          </span>
          <span className="text-xs text-slate-400 mt-1">{task.date}</span>
        </div>
      </label>
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-2 overflow-x-auto text-sm text-slate-300 flex-wrap">
          <span
            className={`px-2 py-1 bg-slate-700 rounded-md transition-all duration-300 ${contentStyles}`}
          >
            {task.priority}
          </span>
          <span
            className={`px-2 py-1 border border-slate-600 rounded-md transition-all duration-300 ${contentStyles}`}
          >
            {task.category}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto pl-2 shrink-0">
          <button
            onClick={() => editTask()}
            type="button"
            className="cursor-pointer p-2"
          >
            ✏️
          </button>
        </div>
        {isEditOpen && (
          <EditTaskModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            task={task}
          />
        )}
      </div>
    </motion.li>
  );
};

export default TaskItem;
