import {
  schemaTask,
  type EnergyLevel,
  type Priority,
  type SubTask,
  type Task,
} from "../../types";
import {
  useAddSubTask,
  useAllCategories,
  useDeleteSubTask,
  useDeleteTask,
  useToggleSubTask,
  useUpdateSubTask,
  useUpdateTask,
} from "../../store/useTaskStore";
import { useTaskStore } from "../../store/useTaskStore";
import { useRef, useState, type CSSProperties } from "react";
import Modal from "../ui/Modal";
import {
  Check,
  CheckSquare,
  GripVertical,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface IDialog {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

interface SortableSubTaskProps {
  sub: SubTask;
  onToggle: (subId: number, currentStatus: boolean) => void;
  onDelete: (subId: number) => void;
  onRename: (subId: number, title: string) => Promise<void>;
}

const SortableSubTask = ({
  sub,
  onToggle,
  onDelete,
  onRename,
}: SortableSubTaskProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(sub.title);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  const saveTitle = async () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setDraftTitle(sub.title);
      setIsEditing(false);
      return;
    }

    await onRename(sub.id, trimmedTitle);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraftTitle(sub.title);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex touch-none items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-indigo-300"
        aria-label="Перетащить подзадачу"
      >
        <GripVertical size={15} />
      </button>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(sub.id, sub.completed)}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-slate-500 hover:text-indigo-400 transition-colors"
        >
          {sub.completed ? (
            <CheckSquare size={16} className="text-indigo-400" />
          ) : (
            <Square size={16} />
          )}
        </button>
        {isEditing ? (
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveTitle();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="min-w-0 flex-1 rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400/40 dark:border-indigo-500/50 dark:bg-slate-950 dark:text-slate-100"
            autoFocus
          />
        ) : (
          <span
            className={`text-sm truncate ${
              sub.completed
                ? "text-slate-500 line-through"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {sub.title}
          </span>
        )}
      </div>

      {isEditing ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void saveTitle()}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-1 text-emerald-500 transition-colors hover:bg-emerald-500/10"
            aria-label="Сохранить название подзадачи"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-500/10"
            aria-label="Отменить редактирование"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded p-1 text-slate-500 transition-colors hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300"
          aria-label="Редактировать название подзадачи"
        >
          <Pencil size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={() => onDelete(sub.id)}
        onPointerDown={(e) => e.stopPropagation()}
        className="rounded p-1 text-slate-500 transition-colors hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

const EditTaskModal = ({ isOpen, onClose, task }: IDialog) => {
  const [values, setValues] = useState<Task>({
    ...task,
    date: task.date || "",
    category: task.category || "",
    subtasks: task.subtasks ?? [],
  });
  const [subTitle, setSubTitle] = useState("");
  const subTaskInputRef = useRef<HTMLInputElement>(null);

  const updateTask = useUpdateTask();
  const remove = useDeleteTask();
  const addSubTask = useAddSubTask();
  const toggleSubTask = useToggleSubTask();
  const updateSubTask = useUpdateSubTask();
  const deleteSubTask = useDeleteSubTask();
  const categories = useAllCategories();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    })
  );

  const refreshSubtasks = (taskId: number) => {
    const updated = useTaskStore
      .getState()
      .tasks.find((item: Task) => item.id === taskId);

    if (!updated) return;

    setValues((current) => ({
      ...current,
      id: updated.id,
      category: updated.category || "",
      subtasks: updated.subtasks ?? [],
    }));
  };

  const focusSubTaskInput = () => {
    window.requestAnimationFrame(() => subTaskInputRef.current?.focus());
  };

  const addSubTaskFromInput = async () => {
    const trimmedSubTitle = subTitle.trim();
    if (!trimmedSubTitle) return;

    const createdSubTask = await addSubTask(values.id, trimmedSubTitle);
    if (!createdSubTask) return;

    setSubTitle("");
    refreshSubtasks(values.id);
    focusSubTaskInput();
  };

  const handleAddSub = async (e: React.MouseEvent<HTMLButtonElement>) => {
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

  const handleToggleSub = async (subId: number, currentStatus: boolean) => {
    const updatedSubTask = await toggleSubTask(subId, values.id, !currentStatus);
    if (!updatedSubTask) return;

    refreshSubtasks(updatedSubTask.taskId);
  };

  const handleDeleteSub = async (subId: number) => {
    await deleteSubTask(values.id, subId);

    refreshSubtasks(values.id);
  };

  const handleRenameSub = async (subId: number, title: string) => {
    const updatedSubTask = await updateSubTask(values.id, subId, { title });
    if (!updatedSubTask) return;

    refreshSubtasks(updatedSubTask.taskId);
  };

  const handleSubTaskDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setValues((current) => {
      const currentSubTasks = current.subtasks ?? [];
      const oldIndex = currentSubTasks.findIndex(
        (sub) => sub.id === active.id
      );
      const newIndex = currentSubTasks.findIndex((sub) => sub.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return current;

      const reorderedSubTasks = arrayMove(
        currentSubTasks,
        oldIndex,
        newIndex
      ).map((sub, index) => ({
        ...sub,
        position: index,
      }));

      return {
        ...current,
        subtasks: reorderedSubTasks,
      };
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!(values.title || "").trim()) {
      alert("Название задачи не может быть пустым!");
      return;
    }

    const parsedValues = schemaTask.safeParse({
      ...values,
      category: (values.category || "").trim(),
    });
    if (parsedValues.success) {
      const updatedTask = await updateTask(values.id, parsedValues.data);
      if (!updatedTask) return;

      const pendingSubTitle = subTitle.trim();
      if (pendingSubTitle) {
        const createdSubTask = await addSubTask(values.id, pendingSubTitle);
        if (!createdSubTask) return;
      }

      onClose();
    } else {
      alert("Поле не может быть пустым!");
    }
  };

  const deleteTask = (): void => {
    remove(values.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={"Редактировать задачу"}>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="text"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Дата задачи
            </label>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Приоритет
            </label>
            <div className="relative">
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer pr-10"
                value={values.priority}
                onChange={(e) =>
                  setValues({ ...values, priority: e.target.value as Priority })
                }
              >
                <option value="🔥 P1">🔥 Высокий</option>
                <option value="⚡️ P2">⚡️ Средний</option>
                <option value="💤 P3">💤 Низкий</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">
                ▼
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Энергозатратность:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { value: "low", label: "Низкая", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" },
              { value: "med", label: "Средняя", color: "border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300" },
              { value: "high", label: "Высокая", color: "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300" }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValues({ ...values, energyLevel: option.value as EnergyLevel })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  values.energyLevel === option.value
                    ? `border-2 ${option.color.split(' ')[0]} bg-opacity-20`
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            value={values.category || ""}
            onChange={(e) => setValues({ ...values, category: e.target.value })}
            type="text"
            placeholder="Напишите категорию задачи"
            list="categories-list"
          />
        </div>
        <datalist id="categories-list">
          {categories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        <div className="mt-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <label className="mb-1.5 block text-[11px] font-medium text-slate-600 dark:text-slate-400 sm:text-sm">
            Подзадачи
          </label>

          <div className="flex gap-2 mb-3">
            <input
              ref={subTaskInputRef}
              type="text"
              placeholder="Добавить подзадачу..."
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={handleSubTaskKeyDown}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddSub}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {(values.subtasks?.length || 0) > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSubTaskDragEnd}
            >
              <SortableContext
                items={(values.subtasks ?? []).map((sub) => sub.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {(values.subtasks ?? []).map((sub: SubTask) => (
                    <SortableSubTask
                      key={sub.id}
                      sub={sub}
                      onToggle={handleToggleSub}
                      onDelete={handleDeleteSub}
                      onRename={handleRenameSub}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            className="px-4 py-2 text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => onClose()}
            type="button"
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
            type="submit"
          >
            Сохранить
          </button>
          <button
            onClick={deleteTask}
            type="button"
            className="text-red-400 hover:text-red-300 cursor-pointer p-2 transition-colors"
          >
            Удалить
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTaskModal;
