import { useRef, useState, type CSSProperties } from "react";
import type { SubTask, Task } from "../../types";
import EditTaskModal from "./EditTaskModal";
import { motion } from "framer-motion";
import {
  useAddSubTask,
  useTaskStore,
  useToggleSubTask,
} from "../../store/useTaskStore";
import {
  CheckSquare,
  Clock3,
  ListChecks,
  Plus,
  Square,
  Pencil,
  Trash2,
  NotebookPen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { formatTaskDateForUI } from "../../utils/taskDateGroups";
import { CSS } from "@dnd-kit/utilities";
import { useAiTone } from "../../store/useAuthStore";
import { formatLocalDateOnly } from "../../utils/localDate";
import {
  formatPlannedDuration,
  isStrictOverdueTask,
} from "../../utils/behaviorMode";

const getPriorityLabel = (priority: string) => {
  if (priority.includes("P1")) return "Высокий";
  if (priority.includes("P2")) return "Средний";
  if (priority.includes("P3")) return "Низкий";

  return priority;
};

const getPriorityRibbonStyles = (priority: string) => {
  if (priority.includes("P1")) {
    return "border-red-500/80 bg-white/80 text-red-600 dark:bg-slate-950/70 dark:text-red-300";
  }

  if (priority.includes("P2")) {
    return "border-amber-400/80 bg-white/80 text-amber-700 dark:bg-slate-950/70 dark:text-amber-300";
  }

  return "border-emerald-500/80 bg-white/80 text-emerald-700 dark:bg-slate-950/70 dark:text-emerald-300";
};

const getEnergyAccentStyles = (energyLevel: string) => {
  if (energyLevel === "high") return "bg-red-500";
  if (energyLevel === "med") return "bg-yellow-400";

  return "bg-green-500";
};

const TaskItem = ({
  task: initialTask,
  toggle,
  onRequestDelete,
  isSelectionMode,
  isSelected,
  onToggleSelected,
  onRequestActualTime,
}: {
  task: Task;
  toggle: (id: number) => Promise<Task | undefined>;
  onRequestDelete: (task: Task) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelected?: (taskId: number) => void;
  onRequestActualTime: (task: Task) => void;
}) => {
  const storeTask = useTaskStore((state) =>
    state.tasks.find((t) => t.id === initialTask.id)
  );
  const task = storeTask ?? initialTask;
  const aiTone = useAiTone();
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
  const subTaskInputRef = useRef<HTMLInputElement>(null);

  const addSubTask = useAddSubTask();
  const toggleSubTask = useToggleSubTask();

  const editTask = () => {
    setIsEditOpen(true);
  };

  const contentStyles = task.completed
    ? "line-through text-slate-400 opacity-60 dark:text-slate-500"
    : "text-slate-900 dark:text-slate-100";
  const taskSurfaceStyles =
    "bg-white/55 backdrop-blur-sm hover:bg-white/75 dark:bg-slate-900/25 dark:hover:bg-slate-900/40";

  const isPrimaryCheckboxChecked = isSelectionMode ? isSelected : task.completed;

  const handlePrimaryCheckboxClick = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    if (isSelectionMode) {
      onToggleSelected?.(task.id);
      return;
    }

    const wasCompleted = task.completed;
    const updatedTask = await toggle(task.id);
    if (!wasCompleted && updatedTask?.completed && !updatedTask.actualMinutes) {
      onRequestActualTime(updatedTask);
    }
  };

  const focusSubTaskInput = () => {
    window.requestAnimationFrame(() => subTaskInputRef.current?.focus());
  };

  const addSubTaskFromInput = async () => {
    const trimmedSubTitle = newSubTitle.trim();
    if (!trimmedSubTitle) return;

    const createdSubTask = await addSubTask(task.id, trimmedSubTitle);
    if (!createdSubTask) return;

    setNewSubTitle("");
    focusSubTaskInput();
  };

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSubTaskFromInput();
  };

  const handleSubTaskKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    await addSubTaskFromInput();
  };

  const handleDelete = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    onRequestDelete(task);
  };

  const totalSubs = task.subtasks?.length || 0;
  const completedSubs = task.subtasks?.filter((s) => s.completed).length || 0;
  const category = (task.category || "").trim();
  const priorityLabel = getPriorityLabel(task.priority);
  const priorityRibbonStyles = getPriorityRibbonStyles(task.priority);
  const energyAccentStyles = getEnergyAccentStyles(task.energyLevel);
  const plannedDuration = formatPlannedDuration(task.estimatedMinutes);
  const strictOverdue = isStrictOverdueTask(task, aiTone, formatLocalDateOnly());
  const sortableStyle: CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.li
      id={`task-${task.id}`}
      ref={setNodeRef}
      style={sortableStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      exit={{ opacity: 0 }}
      className="group relative flex w-full flex-col overflow-visible pt-3"
    >
      <div
        className={`absolute left-5 top-0 z-20 inline-flex h-7 max-w-[calc(100%-2.5rem)] items-center rounded-t-xl rounded-b-md border px-3 text-xs font-black tracking-wide shadow-sm backdrop-blur-md dark:shadow-none ${priorityRibbonStyles}`}
      >
        <span className="truncate">{priorityLabel}</span>
      </div>
      <motion.div
        {...attributes}
        {...listeners}
        draggable={false}
        className={`relative z-10 flex w-full cursor-grab flex-col overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm transition-all active:cursor-grabbing dark:border-slate-800 dark:shadow-none ${
          isDragging
            ? "border-indigo-500 opacity-50 shadow-xl shadow-indigo-500/20"
            : ""
        } ${taskSurfaceStyles}`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1.5 ${energyAccentStyles}`}
        />
        <div className="flex flex-wrap justify-between sm:items-center gap-x-4 gap-y-3 w-full">
          <div className="flex items-center gap-4 w-full sm:w-auto flex-1 min-w-50">
            <button
              type="button"
              onClick={handlePrimaryCheckboxClick}
              onPointerDown={(e) => e.stopPropagation()}
              aria-pressed={isPrimaryCheckboxChecked}
              aria-label={
                isSelectionMode
                  ? isSelected
                    ? "Убрать задачу из выбранных"
                    : "Выбрать задачу для массового действия"
                  : task.completed
                  ? "Вернуть задачу в активные"
                  : "Отметить задачу выполненной"
              }
              className={`w-5 h-5 shrink-0 border-2 rounded-md flex items-center justify-center transition-colors cursor-pointer ${isPrimaryCheckboxChecked ? "bg-indigo-500 border-indigo-500" : "border-slate-500"}`}
            >

              <svg
                className={`w-3.5 h-3.5 text-white transition-opacity ${
                  isPrimaryCheckboxChecked ? "opacity-100" : "opacity-0"
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
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className={strictOverdue ? "font-bold text-red-600 dark:text-red-300" : "text-slate-600 dark:text-slate-400"}>
                  {formatTaskDateForUI(task.date)}
                </span>
                {plannedDuration && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300/50 bg-cyan-400/10 px-2 py-0.5 font-semibold text-cyan-700 dark:border-cyan-400/25 dark:text-cyan-200">
                    <Clock3 size={12} aria-hidden="true" />
                    <span aria-label={`Плановая длительность: ${plannedDuration}`}>{plannedDuration}</span>
                  </span>
                )}
              </div>
              {totalSubs > 0 && (
                <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-indigo-200 bg-white/70 px-2 py-1 text-xs font-medium text-indigo-600 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-indigo-300">
                  <ListChecks size={13} />
                  {completedSubs}/{totalSubs}
                </span>
              )}
              {!!task.noteLinks?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.noteLinks.map(({ note }) => (
                    <Link
                      key={note.id}
                      to={`/notes/${note.id}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="inline-flex max-w-52 items-center gap-1 rounded-md border border-violet-200 bg-violet-50/70 px-2 py-1 text-xs font-medium text-violet-700 hover:border-violet-400 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                    >
                      <NotebookPen size={12} />
                      <span className="truncate">{note.title || "Без заголовка"}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto text-sm text-slate-700 dark:text-slate-300">
              {category && (
                <span
                  className={`rounded-md border border-slate-300 bg-white/60 px-2 py-1 transition-all duration-300 dark:border-slate-600 dark:bg-transparent ${contentStyles}`}
                >
                  {category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 ml-auto pl-2 shrink-0">
              <button
                onClick={handleDelete}
                onPointerDown={(e) => e.stopPropagation()}
                type="button"
                className="hidden cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-300 md:flex"
                title="Удалить задачу"
                aria-label="Удалить задачу"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsAddingSub(!isAddingSub)}
                type="button"
                className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-indigo-500/20 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
                title="Добавить подзадачу"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => editTask()}
                type="button"
                className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-indigo-500/20 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
              >
                <Pencil size={15} />
              </button>
            </div>
          </div>
        </div>

        {isAddingSub && (
          <form onSubmit={handleAddSub} className="mt-3 flex gap-2 pl-9">
            <input
              ref={subTaskInputRef}
              type="text"
              placeholder="Название подзадачи..."
              value={newSubTitle}
              onChange={(e) => setNewSubTitle(e.target.value)}
              onKeyDown={handleSubTaskKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
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
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/70 pt-2.5 pl-9 dark:border-slate-800/50">
            {task.subtasks.map((sub: SubTask) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
              >
                <button
                  type="button"
                  onClick={() => toggleSubTask(sub.id, task.id, !sub.completed)}
                  className="text-slate-400 transition-colors hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400"
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
                      ? "text-slate-400 line-through dark:text-slate-500"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

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
