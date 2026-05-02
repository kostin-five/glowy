// import React from 'react'
import type { Task } from "../types";

const TaskItem = ({
  task,
  remove,
  toggle,
}: {
  task: Task;
  remove: (id: number) => void;
  toggle: (id: number) => void;
}) => {
  const deleteTask = (): void => {
    remove(task.id);
  };

  const contentStyles = task.completed
    ? "line-through text-slate-500 opacity-50"
    : "text-slate-200";

  return (
    <li className="flex justify-between items-center bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl mb-3 hover:bg-slate-800/60 transition-colors">
      <label className="flex items-center gap-4 cursor-pointer group">
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

        <div className="flex flex-col">
          <span
            className={`font-medium transition-all duration-300 ${contentStyles}`}
          >
            {task.title}
          </span>
          <span className="text-xs text-slate-400 mt-1">{task.date}</span>
        </div>
      </label>

      <div className="flex items-center gap-4 text-sm text-slate-300 ml-auto mr-4">
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

      <button
        onClick={deleteTask}
        type="button"
        className="text-red-400 hover:text-red-300 cursor-pointer p-2 transition-colors"
      >
        Удалить
      </button>
    </li>
  );
};

export default TaskItem;
