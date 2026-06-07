import { useRef, useState, type CSSProperties } from "react";
import {
  useAllCategories,
  useCreateTask,
  useSetFilter,
} from "../../store/useTaskStore";
import {
  schemaTaskDraft,
  type EnergyLevel,
  type Priority,
  type TaskDraft,
} from "../../types";
import Modal from "../ui/Modal";
import { Plus, Trash2 } from "lucide-react";
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

interface ICreateModal {
  isOpen: boolean;
  onClose: () => void;
}

interface LocalSubTask {
  clientId: number;
  title: string;
}

interface SortableSubTaskProps {
  sub: LocalSubTask;
  onRemove: (clientId: number) => void;
}

const SortableSubTask = ({ sub, onRemove }: SortableSubTaskProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.clientId });

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
      className="flex cursor-grab touch-none items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm active:cursor-grabbing dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-100 dark:shadow-none"
    >
      <span className="truncate">{sub.title}</span>
      <button
        type="button"
        onClick={() => onRemove(sub.clientId)}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

const CreateTaskForm = ({ isOpen, onClose }: ICreateModal) => {
  const [values, setValues] = useState<TaskDraft>({
    title: "",
    date: "",
    priority: "⚡️ P2",
    category: "",
    completed: false,
    energyLevel: "med",
    subtasks: [],
  });

  const [subTitle, setSubTitle] = useState("");
  const [localSubTasks, setLocalSubTasks] = useState<LocalSubTask[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const subTaskInputRef = useRef<HTMLInputElement>(null);
  const categories = useAllCategories();
  const setFilter = useSetFilter();
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

  const clean = () => {
    setValues({
      title: "",
      date: "",
      priority: "⚡️ P2",
      category: "",
      completed: false,
      energyLevel: "med",
      subtasks: [],
    });
    setLocalSubTasks([]);
    setSubTitle("");
    setError("");
  };

  const create = useCreateTask();

  const focusSubTaskInput = () => {
    window.requestAnimationFrame(() => subTaskInputRef.current?.focus());
  };

  const addLocalSubTaskFromInput = () => {
    const trimmedSubTitle = subTitle.trim();
    if (!trimmedSubTitle) return;

    setLocalSubTasks((currentSubTasks) => [
      ...currentSubTasks,
      { clientId: Date.now(), title: trimmedSubTitle },
    ]);
    setSubTitle("");
    focusSubTaskInput();
  };

  const handleAddLocalSub = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    addLocalSubTaskFromInput();
  };

  const handleSubTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    addLocalSubTaskFromInput();
  };

  const handleRemoveLocalSub = (clientId: number) => {
    setLocalSubTasks(localSubTasks.filter((sub) => sub.clientId !== clientId));
  };

  const handleSubTaskDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setLocalSubTasks((currentSubTasks) => {
      const oldIndex = currentSubTasks.findIndex(
        (sub) => sub.clientId === active.id
      );
      const newIndex = currentSubTasks.findIndex(
        (sub) => sub.clientId === over.id
      );

      if (oldIndex === -1 || newIndex === -1) return currentSubTasks;

      return arrayMove(currentSubTasks, oldIndex, newIndex);
    });
  };

  const sendTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!(values.title || "").trim()) {
      setError("Название задачи не может быть пустым.");
      return;
    }

    const pendingSubTitle = subTitle.trim();
    const subtasksForBackend = [
      ...localSubTasks.map((sub, index) => ({
        title: sub.title,
        completed: false,
        position: index,
      })),
      ...(pendingSubTitle
        ? [
            {
              title: pendingSubTitle,
              completed: false,
              position: localSubTasks.length,
            },
          ]
        : []),
    ];

    const parsedValues = schemaTaskDraft.safeParse({
      ...values,
      category: (values.category || "").trim(),
      subtasks: subtasksForBackend,
    });

    if (parsedValues.success) {
      try {
        setIsSubmitting(true);
        const createdTask = await create(parsedValues.data);
        if (!createdTask) {
          setError("Не удалось создать задачу. Попробуй ещё раз.");
          return;
        }

        setFilter("Активные");
        clean();
        onClose();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Не удалось создать задачу. Попробуй ещё раз."
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setError("Заполните корректно все поля.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать задачу">
      <form
        className="flex flex-col
       w-full gap-4
       "
        onSubmit={sendTask}
      >
        <input
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          type="text"
          placeholder="Введите задачу"
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
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

        <div className="space-y-2 border-t border-slate-200 pt-2 dark:border-slate-800">
          <label className="mb-1.5 block text-[11px] font-medium text-slate-600 dark:text-slate-400 sm:text-sm">
            Подзадачи
          </label>

          <div className="flex gap-2">
            <input
              ref={subTaskInputRef}
              type="text"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Что нужно сделать?"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={handleSubTaskKeyDown}
            />
            <button
              type="button"
              onClick={handleAddLocalSub}
              className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={18} />
            </button>
          </div>

          {localSubTasks.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSubTaskDragEnd}
            >
              <SortableContext
                items={localSubTasks.map((sub) => sub.clientId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                  {localSubTasks.map((sub) => (
                    <SortableSubTask
                      key={sub.clientId}
                      sub={sub}
                      onRemove={handleRemoveLocalSub}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <button
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-500/40 disabled:cursor-not-allowed text-white rounded-lg p-2.5 font-medium transition-colors w-full mt-2 cursor-pointer"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Сохраняю..." : "Сохранить"}
        </button>
        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default CreateTaskForm;
