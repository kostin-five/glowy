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
  useUpdateTask,
} from "../../store/useTaskStore";
import { useTaskStore } from "../../store/useTaskStore";
import { useRef, useState, type CSSProperties } from "react";
import Modal from "../ui/Modal";
import { Trash2, Plus, CheckSquare, Square } from "lucide-react";
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
}

const SortableSubTask = ({
  sub,
  onToggle,
  onDelete,
}: SortableSubTaskProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab touch-none items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm active:cursor-grabbing dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none"
    >
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
        <span
          className={`text-sm truncate ${
            sub.completed
              ? "text-slate-500 line-through"
              : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {sub.title}
        </span>
      </div>
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
    category: task.category || "",
    subtasks: task.subtasks ?? [],
  });
  const [subTitle, setSubTitle] = useState("");
  const subTaskInputRef = useRef<HTMLInputElement>(null);

  const updateTask = useUpdateTask();
  const remove = useDeleteTask();
  const addSubTask = useAddSubTask();
  const toggleSubTask = useToggleSubTask();
  const deleteSubTask = useDeleteSubTask();
  const categories = useAllCategories();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
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
        <div className="flex sm:flex-row flex-col gap-4 w-full">
          <div className="flex-1">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600 dark:text-slate-400 sm:text-xs">
              Дата задачи
            </label>
            <input
              className="h-11.5 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none scheme-dark"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>
          <div className="flex-1 relative">
            <label className="mb-1.5 block text-[11px] font-medium text-slate-600 dark:text-slate-400 sm:text-xs">
              Приоритет
            </label>
            <div className="relative">
              <select
                className="h-11.5 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none cursor-pointer pr-10"
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

        <div className="text-slate-900 dark:text-slate-100">
          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Энергозатратность задачи:
          </p>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              <input
                className="accent-indigo-500"
                type="radio"
                value={"low"}
                name="energy"
                checked={values.energyLevel === "low"}
                onChange={(e) =>
                  setValues({
                    ...values,
                    energyLevel: e.target.value as EnergyLevel,
                  })
                }
              />
              Низкая
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              <input
                className="accent-indigo-500"
                type="radio"
                value={"med"}
                name="energy"
                checked={values.energyLevel === "med"}
                onChange={(e) =>
                  setValues({
                    ...values,
                    energyLevel: e.target.value as EnergyLevel,
                  })
                }
              />
              Средняя
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              <input
                className="accent-indigo-500"
                type="radio"
                value={"high"}
                name="energy"
                checked={values.energyLevel === "high"}
                onChange={(e) =>
                  setValues({
                    ...values,
                    energyLevel: e.target.value as EnergyLevel,
                  })
                }
              />
              Высокая
            </label>
          </div>
        </div>
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          value={values.category || ""}
          onChange={(e) => setValues({ ...values, category: e.target.value })}
          type="text"
          placeholder="Напишите категорию задачи"
          list="categories-list"
        />
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
