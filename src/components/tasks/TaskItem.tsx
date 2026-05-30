import { useState, type CSSProperties } from "react";
import type { SubTask, Task } from "../../types";
import EditTaskModal from "./EditTaskModal";
import { motion } from "framer-motion";
import {
  useAddSubTask,
  useTaskStore,
  useToggleSubTask,
} from "../../store/useTaskStore";
import { CheckSquare, ListChecks, Plus, Square } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TaskItem = ({
  task: initialTask,
  toggle,
}: {
  task: Task;
  toggle: (id: number) => void;
}) => {
  const storeTask = useTaskStore((state) =>
    state.tasks.find((t) => t.id === initialTask.id)
  );
  const task = storeTask ?? initialTask;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [isAddingSub, setIsAddingSub] = useState(false);

  const addSubTask = useAddSubTask();
  const toggleSubTask = useToggleSubTask();

  const editTask = () => {
    setIsEditOpen(true);
  };

  const contentStyles = task.completed
    ? "line-through text-slate-500 opacity-50"
    : "text-slate-200";

  const handleToggleTask = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggle(task.id);
  };

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim()) return;
    const createdSubTask = await addSubTask(task.id, newSubTitle.trim());
    if (!createdSubTask) return;

    setNewSubTitle("");
    setIsAddingSub(false);
  };

  const totalSubs = task.subtasks?.length || 0;
  const completedSubs = task.subtasks?.filter((s) => s.completed).length || 0;
  const category = (task.category || "").trim();
  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <motion.li
      ref={setNodeRef}
      style={sortableStyle}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0 }}
      animate={{ opacity: isDragging ? 0.92 : 1 }}
      exit={{ opacity: 0 }}
      className={`flex flex-col border-l-4 ${
        task.energyLevel === "high"
          ? "bg-red-500/20 border-l-red-500"
          : task.energyLevel === "med"
          ? "bg-yellow-500/20 border-l-yellow-500"
          : "bg-green-500/30 border-l-green-500"
      } p-4 rounded-xl mb-3 hover:bg-slate-800/60 transition-colors w-full cursor-grab active:cursor-grabbing touch-none`}
    >
      <div className="flex flex-wrap justify-between sm:items-center gap-x-4 gap-y-3 w-full">
        <div className="flex items-center gap-4 group w-full sm:w-auto flex-1 min-w-50">
          <button
            type="button"
            onClick={handleToggleTask}
            onPointerDown={(e) => e.stopPropagation()}
            aria-pressed={task.completed}
            aria-label={
              task.completed
                ? "Вернуть задачу в активные"
                : "Отметить задачу выполненной"
            }
            className={`w-5 h-5 shrink-0 border-2 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              task.completed
                ? "bg-indigo-500 border-indigo-500"
                : "border-slate-500"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 text-white transition-opacity ${
                task.completed ? "opacity-100" : "opacity-0"
              }`}
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
          </button>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span
              className={`font-medium transition-all duration-300 block truncate ${contentStyles}`}
            >
              {task.title}
            </span>
            <span className="text-xs text-slate-400 mt-1">{task.date}</span>
            {totalSubs > 0 && (
              <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900/50 px-2 py-1 text-xs font-medium text-indigo-300">
                <ListChecks size={13} />
                {completedSubs}/{totalSubs}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 overflow-x-auto text-sm text-slate-300 flex-wrap">
            <span
              className={`px-2 py-1 bg-slate-700 rounded-md transition-all duration-300 ${contentStyles}`}
            >
              {task.priority}
            </span>
            {category && (
              <span
                className={`px-2 py-1 border border-slate-600 rounded-md transition-all duration-300 ${contentStyles}`}
              >
                {category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-auto pl-2 shrink-0">
            <button
              onClick={() => setIsAddingSub(!isAddingSub)}
              type="button"
              className="cursor-pointer p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Добавить подзадачу"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => editTask()}
              type="button"
              className="cursor-pointer p-2"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      {isAddingSub && (
        <form onSubmit={handleAddSub} className="mt-3 flex gap-2 pl-9">
          <input
            type="text"
            placeholder="Название подзадачи..."
            value={newSubTitle}
            onChange={(e) => setNewSubTitle(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            className="bg-indigo-600 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-indigo-500"
          >
            ОК
          </button>
        </form>
      )}

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3 pl-9 flex flex-col gap-2 border-t border-slate-800/50 pt-2.5">
          {task.subtasks.map((sub: SubTask) => (
            <div
              key={sub.id}
              className="flex items-center gap-2 text-xs text-slate-300"
            >
              <button
                type="button"
                onClick={() => toggleSubTask(sub.id, task.id, !sub.completed)}
                className="text-slate-500 hover:text-indigo-400 transition-colors"
              >
                {sub.completed ? (
                  <CheckSquare size={14} className="text-indigo-400" />
                ) : (
                  <Square size={14} />
                )}
              </button>
              <span
                className={`truncate ${
                  sub.completed
                    ? "line-through text-slate-500"
                    : "text-slate-300"
                }`}
              >
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {isEditOpen && (
        <EditTaskModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          task={task}
        />
      )}
    </motion.li>
  );
};

export default TaskItem;
