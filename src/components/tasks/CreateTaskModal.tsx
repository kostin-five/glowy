import { useState, type CSSProperties } from "react";
import { useAllCategories, useCreateTask } from "../../store/useTaskStore";
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
      className="flex items-center justify-between text-sm text-slate-300 bg-slate-800/40 px-3 py-1.5 rounded-lg cursor-grab active:cursor-grabbing touch-none"
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
  };

  const create = useCreateTask();

  const handleAddLocalSub = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) return;

    setLocalSubTasks([
      ...localSubTasks,
      { clientId: Date.now(), title: subTitle.trim() },
    ]);
    setSubTitle("");
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

    if (!(values.title || "").trim()) {
      alert("Название задачи не может быть пустым!");
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
      const createdTask = await create(parsedValues.data);
      if (!createdTask) return;

      clean();
      onClose();
    } else {
      alert("Заполните корректно все поля!");
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
          className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          type="text"
          placeholder="Введите задачу"
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
        />
        <div className="flex sm:flex-row flex-col gap-4 w-full">
          <div className="flex-1">
            <label className="text-[11px] sm:text-xs font-medium text-slate-400 mb-1.5 block">
              Дата задачи
            </label>
            <input
              className="w-full h-11.5 bg-slate-900 border border-slate-700 rounded-xl px-4 text-slate-200 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none scheme-dark"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>
          <div className="flex-1 relative">
            <label className="text-[11px] sm:text-xs font-medium text-slate-400 mb-1.5 block">
              Приоритет
            </label>
            <div className="relative">
              <select
                className="w-full h-11.5 bg-slate-900 border border-slate-700 rounded-xl px-4 text-slate-200 
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

              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        <div className="text-slate-200">
          <p className="text-sm font-medium text-slate-400 mb-2">
            Энергозатратность задачи:
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
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

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
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

            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
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
          className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
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

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-[11px] sm:text-sm font-medium text-slate-400 mb-1.5 block">
            Подзадачи
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
              placeholder="Что нужно сделать?"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
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
                <div className="mt-2 p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
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
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg p-2.5 font-medium transition-colors w-full mt-2 cursor-pointer"
          type="submit"
        >
          Сохранить
        </button>
      </form>
    </Modal>
  );
};

export default CreateTaskForm;
