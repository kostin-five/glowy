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
import { Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
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
import FirstUsePopover from "../onboarding/FirstUsePopover";
import { useAuthStore } from "../../store/useAuthStore";
import {
  getTaskFormPreferenceScope,
  useTaskFormPreferences,
  type TaskFormMode,
} from "../../store/useSettingsStore";
import TaskFormModeControl from "./TaskFormModeControl";
import { getTaskFormSections } from "./taskFormPresentation";
import AiSubtaskDraft from "./AiSubtaskDraft";

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
  onRename: (clientId: number, title: string) => void;
}

const SortableSubTask = ({
  sub,
  onRemove,
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
  } = useSortable({ id: sub.clientId });
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(sub.title);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
    opacity: isDragging ? 0.92 : 1,
  };

  const saveTitle = () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setDraftTitle(sub.title);
      setIsEditing(false);
      return;
    }

    onRename(sub.clientId, trimmedTitle);
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
      className="flex touch-none items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-100 dark:shadow-none"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-500 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-indigo-300"
        aria-label="Перетащить подзадачу"
      >
        <GripVertical size={14} />
      </button>

      {isEditing ? (
        <input
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveTitle();
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
        <span className="min-w-0 flex-1 truncate">{sub.title}</span>
      )}

      {isEditing ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={saveTitle}
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
    estimatedMinutes: null,
    subtasks: [],
  });


  const [subTitle, setSubTitle] = useState("");
  const [localSubTasks, setLocalSubTasks] = useState<LocalSubTask[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const subTaskInputRef = useRef<HTMLInputElement>(null);
  const submitInFlightRef = useRef(false);
  const userId = useAuthStore((state) => state.userId);
  const isGuest = useAuthStore((state) => state.isGuest);
  const accountScope = getTaskFormPreferenceScope(userId, isGuest);
  const preferences = useTaskFormPreferences(accountScope);
  const [mode, setMode] = useState<TaskFormMode>(preferences.mode);
  const sections = getTaskFormSections(mode, preferences, detailsExpanded);
  const categories = useAllCategories();
  const setFilter = useSetFilter();
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

  const clean = () => {
    setValues({
      title: "",
      date: "",
      priority: "⚡️ P2",
      category: "",
      completed: false,
      energyLevel: "med",
      estimatedMinutes: null,
      subtasks: [],
    });
    setLocalSubTasks([]);
    setSubTitle("");
    setError("");
    setDetailsExpanded(false);
  };

  const handleClose = () => {
    if (submitInFlightRef.current) return;
    clean();
    onClose();
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

  const handleRenameLocalSub = (clientId: number, title: string) => {
    setLocalSubTasks((currentSubTasks) =>
      currentSubTasks.map((sub) =>
        sub.clientId === clientId ? { ...sub, title } : sub
      )
    );
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
    if (submitInFlightRef.current) return;
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
        submitInFlightRef.current = true;
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
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    } else {
      setError("Заполните корректно все поля.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Создать задачу">
      <form
        className="flex w-full flex-col gap-4"
        onSubmit={sendTask}
      >
        <TaskFormModeControl mode={mode} onChange={setMode} />

        <div className="relative">
          <label htmlFor="create-task-title" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Название задачи
          </label>
          <input
            id="create-task-title"
            autoFocus
            data-autofocus
            aria-invalid={Boolean(error && !(values.title || "").trim())}
            aria-describedby={error ? "create-task-error" : undefined}
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            type="text"
            placeholder="Введите задачу"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
          <FirstUsePopover id="taskCreation">
            Начни с названия. Остальные поля можно заполнить только когда они
            действительно помогают спланировать задачу.
          </FirstUsePopover>
        </div>
        {mode === "compact" && !detailsExpanded && (
          <button
            type="button"
            onClick={() => setDetailsExpanded(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
          >
            Добавить детали
          </button>
        )}
        {sections.details && (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {sections.date && <div>
            <label htmlFor="create-task-date" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Дата задачи
            </label>
            <input
              id="create-task-date"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>}
          {sections.priority && <div>
            <label htmlFor="create-task-priority" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Приоритет
            </label>
            <div className="relative">
              <select
                id="create-task-priority"
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
          </div>}
        </div>

        {sections.energy && <div className="space-y-2">
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
        </div>}
        {sections.estimatedMinutes && <div>
          <label htmlFor="create-task-estimate" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Планируемое время, мин
          </label>
          <input
            id="create-task-estimate"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            type="number"
            min="1"
            max="1440"
            inputMode="numeric"
            placeholder="Необязательно"
            value={values.estimatedMinutes ?? ""}
            onChange={(event) =>
              setValues({
                ...values,
                estimatedMinutes: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </div>}
        <div className="relative">
          <label htmlFor="create-task-category" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Категория
          </label>
          <input
            id="create-task-category"
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

        {sections.subtasks && <div className="space-y-2 border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 sm:text-sm">
              Подзадачи
            </label>
            <AiSubtaskDraft
              task={{
                title: values.title,
                category: values.category || "",
                priority: values.priority,
                energyLevel: values.energyLevel,
                estimatedMinutes: values.estimatedMinutes ?? null,
                existingSubtasks: localSubTasks.map((subtask) => subtask.title),
              }}
              onApply={(titles) => {
                const existing = new Set(localSubTasks.map((subtask) => subtask.title.trim().toLocaleLowerCase("ru-RU")));
                const unique = titles.filter((title) => {
                  const key = title.trim().toLocaleLowerCase("ru-RU");
                  if (!key || existing.has(key)) return false;
                  existing.add(key);
                  return true;
                });
                setLocalSubTasks((current) => [
                  ...current,
                  ...unique.map((title, index) => ({ clientId: Date.now() + index, title })),
                ]);
              }}
            />
          </div>

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
                      onRename={handleRenameLocalSub}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>}
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Отмена
          </button>
          <button
            className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-500/40"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Сохраняю..." : "Сохранить задачу"}
          </button>
        </div>
        {error && (
          <p id="create-task-error" role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default CreateTaskForm;
