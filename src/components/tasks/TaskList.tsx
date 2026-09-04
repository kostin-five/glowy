import { useEffect, useRef, useState } from "react";
import {
  useConfirmTaskDeletion,
  useRemoveTaskLocally,
  useRestoreTaskLocally,
  useSetTasks,
  useTasks,
  useToggleTask,
  useUpdateTask,
  useSortField,
  useSortDirection,
  useCompletionNotice,
  useSetCompletionNotice,
} from "../../store/useTaskStore";
import type { SubTask, Task } from "../../types";
import { groupTasks, formatTaskDateForUI } from "../../utils/taskDateGroups";
import TaskItem from "./TaskItem";
import ActualTimePrompt from "./ActualTimePrompt";
import { useProcessedTasks } from "../../hooks/useProcessedTasks";
import { AnimatePresence, motion } from "framer-motion";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckSquare, ListChecks, Square, Trash2 } from "lucide-react";
import {
  useTaskViewMode,
  type TaskViewMode,
} from "../../store/useSettingsStore";
import { trackProductEvent } from "../../utils/analytics";
import Modal from "../ui/Modal";
import { getTomorrowDate, moveSelectedTasks } from "./bulkTaskActions";
import type { TaskAdvancedFilterState } from "../../utils/taskAdvancedFilters";

interface TaskListProps {
  onlyActive?: boolean;
  maxItems?: number;
  viewMode?: TaskViewMode;
  onEmptyClick?: () => void;
  groupByDate?: boolean;
  isBulkSelectMode?: boolean;
  setIsBulkSelectMode?: (value: boolean) => void;
  advancedFilters?: TaskAdvancedFilterState;
}


type PendingTaskDeletion = {
  task: Task;
  index: number;
  timerId: number;
};

const TASK_TRASH_ID = "task-trash";

const TaskTrashDropZone = () => {
  const { isOver, setNodeRef } = useDroppable({
    id: TASK_TRASH_ID,
  });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  if (!isMobile) return null;

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: isOver ? 1.05 : 1 }}
      exit={{ opacity: 0, y: 32, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className={`fixed inset-x-0 bottom-24 z-50 mx-auto flex w-[90%] max-w-sm items-center justify-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-[0_0_30px_rgba(239,68,68,0.35)] backdrop-blur-xl lg:bottom-8 ${
        isOver
          ? "border-red-200 bg-linear-to-r from-red-600 to-rose-600 text-white shadow-[0_0_44px_rgba(244,63,94,0.65)]"
          : "border-red-300 bg-white/90 text-red-700 shadow-[0_0_30px_rgba(239,68,68,0.2)] dark:border-red-400/30 dark:bg-slate-950/80 dark:text-red-100"
      }`}
      aria-label="Перетащи задачу сюда, чтобы удалить"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
          isOver ? "bg-white/20" : "bg-red-500/15"
        }`}
      >
        <Trash2 size={22} />
      </span>
      <span>{isOver ? "Отпусти, чтобы сжечь!" : "Перетащи сюда для удаления"}</span>
    </motion.div>
  );
};

const TaskDragOverlay = ({
  task,
  width,
}: {
  task: Task;
  width: number | null;
}) => {
  const totalSubs = task.subtasks?.length || 0;
  const completedSubs = task.subtasks?.filter((sub) => sub.completed).length || 0;
  const category = (task.category || "").trim();
  const contentStyles = task.completed
    ? "line-through text-slate-500 opacity-50"
    : "text-slate-900 dark:text-slate-100";

  return (
    <div
      style={{ width: width ?? undefined }}
      className={`flex flex-col rounded-xl border border-slate-200 border-l-4 p-4 shadow-2xl ring-1 ring-indigo-400/20 dark:border-slate-800 ${
        task.energyLevel === "high"
          ? "bg-red-50 border-l-red-500 dark:bg-red-500/20"
          : task.energyLevel === "med"
          ? "bg-yellow-50 border-l-yellow-500 dark:bg-yellow-500/20"
          : "bg-green-50 border-l-green-500 dark:bg-green-500/30"
      } cursor-grabbing`}
    >
      <div className="flex flex-wrap justify-between sm:items-center gap-x-4 gap-y-3 w-full">
        <div className="flex items-center gap-4 group w-full sm:w-auto flex-1 min-w-50">
          <div
            className={`w-5 h-5 shrink-0 border-2 rounded-md flex items-center justify-center ${
              task.completed ? "bg-indigo-500 border-indigo-500" : "border-slate-500"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 text-white ${
                task.completed ? "opacity-100" : "opacity-0"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className={`font-medium block truncate ${contentStyles}`}>
              {task.title}
            </span>
            <span className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {formatTaskDateForUI(task.date)}
            </span>
            {totalSubs > 0 && (
              <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-indigo-200 bg-white/70 px-2 py-1 text-xs font-medium text-indigo-600 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-indigo-300">
                <ListChecks size={13} />
                {completedSubs}/{totalSubs}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto text-sm text-slate-700 dark:text-slate-300">
            <span className={`rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 ${contentStyles}`}>
              {task.priority}
            </span>
            {category && (
              <span className={`rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600 ${contentStyles}`}>
                {category}
              </span>
            )}
          </div>
        </div>
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/70 pt-2.5 pl-9 dark:border-slate-800/50">
          {task.subtasks.map((sub: SubTask) => (
            <div key={sub.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              {sub.completed ? (
                <CheckSquare size={14} className="text-indigo-400" />
              ) : (
                <Square size={14} className="text-slate-500" />
              )}
              <span
                className={`truncate ${
                  sub.completed
                    ? "line-through text-slate-500"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TaskList = ({
  onlyActive = false,
  maxItems,
  viewMode,
  onEmptyClick,
  groupByDate = false,
  isBulkSelectMode = false,
  setIsBulkSelectMode,
  advancedFilters,
}: TaskListProps) => {
  const toggle = useToggleTask();
  const updateTask = useUpdateTask();
  const tasks = useTasks();
  const setTasks = useSetTasks();
  const removeTaskLocally = useRemoveTaskLocally();
  const restoreTaskLocally = useRestoreTaskLocally();
  const confirmTaskDeletion = useConfirmTaskDeletion();
  const processedTasks = useProcessedTasks(advancedFilters);
  const taskViewMode = useTaskViewMode();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [isTrashDropEnabled, setIsTrashDropEnabled] = useState(false);
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingTaskDeletion | null>(null);
  const [actualTimeTask, setActualTimeTask] = useState<Task | null>(null);
  const completionNotice = useCompletionNotice();
  const setCompletionNotice = useSetCompletionNotice();

  useEffect(() => {
    if (!completionNotice) return;
    const timer = window.setTimeout(() => setCompletionNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [completionNotice, setCompletionNotice]);

  const saveActualTime = async (minutes: number) => {
    if (!actualTimeTask) return;
    const updatedTask = await updateTask(actualTimeTask.id, {
      actualMinutes: minutes,
    });
    if (!updatedTask) return;
    trackProductEvent("task_time_recorded");
  };

  useEffect(() => {
    const checkMobile = () => setIsTrashDropEnabled(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isMoveDateOpen, setIsMoveDateOpen] = useState(false);
  const [bulkMoveDate, setBulkMoveDate] = useState(getTomorrowDate);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsBulkSelectMode?.(false);
  };

  const handleBulkComplete = async () => {
    const tasksToToggle = displayedTasks.filter((t) => selectedIds.has(t.id) && !t.completed);
    for (const task of tasksToToggle) {
      await toggle(task.id);
    }
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const tasksToDelete = displayedTasks.filter((t) => selectedIds.has(t.id));
    for (const task of tasksToDelete) {
      const removed = removeTaskLocally(task.id);
      if (removed) await confirmTaskDeletion(removed.task.id);
    }
    clearSelection();
  };

  const handleBulkMove = async (targetDate: string) => {
    if (!targetDate || isBulkMoving) return;
    setIsBulkMoving(true);
    const { succeededIds, failedIds } = await moveSelectedTasks({
      tasks: displayedTasks,
      selectedIds,
      targetDate,
      updateTask,
    });
    setIsBulkMoving(false);
    setIsMoveDateOpen(false);
    if (failedIds.length > 0) {
      setSelectedIds(new Set(failedIds));
      setCompletionNotice(
        succeededIds.length > 0
          ? `Перенесено: ${succeededIds.length}. Не удалось: ${failedIds.length}.`
          : "Не удалось перенести выбранные задачи. Попробуй ещё раз."
      );
      return;
    }
    setCompletionNotice(
      succeededIds.length > 0
        ? `Перенесено задач: ${succeededIds.length}.`
        : "Для переноса выбери активные задачи."
    );
    clearSelection();
  };


  const pendingDeletionRef = useRef<PendingTaskDeletion | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    })
  );

  const baseDisplayedTasks = onlyActive
    ? processedTasks.filter((task: Task) => !task.completed)
    : processedTasks;
  const displayedTasks =
    typeof maxItems === "number"
      ? baseDisplayedTasks.slice(0, maxItems)
      : baseDisplayedTasks;
  const displayedTaskIds = new Set(displayedTasks.map((task) => task.id));
  const visibleSelectedIds = new Set(
    Array.from(selectedIds).filter((taskId) => displayedTaskIds.has(taskId))
  );
  const effectiveTaskViewMode = viewMode ?? taskViewMode;
  const sortField = useSortField();
  const sortDirection = useSortDirection();
  
  const groupedTasks = groupByDate && effectiveTaskViewMode === "list" 
    ? groupTasks(displayedTasks, sortField, sortDirection ?? "asc") 
    : null;

  const GroupHeader = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );

  const listContainerClass =
    effectiveTaskViewMode === "grid"
      ? "flex flex-col gap-3 sm:grid sm:auto-rows-fr sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
      : "flex flex-col gap-3";
  const sortingStrategy =
    effectiveTaskViewMode === "grid"
      ? rectSortingStrategy
      : verticalListSortingStrategy;
  const activeTask = activeTaskId
    ? displayedTasks.find((task) => task.id === activeTaskId) ?? null
    : null;

  useEffect(() => {
    return () => {
      const pending = pendingDeletionRef.current;
      if (!pending) return;

      window.clearTimeout(pending.timerId);
      void confirmTaskDeletion(pending.task.id);
      pendingDeletionRef.current = null;
    };
  }, [confirmTaskDeletion]);

  const handleRequestDelete = (task: Task) => {
    const previousPendingDeletion = pendingDeletionRef.current;

    if (previousPendingDeletion) {
      window.clearTimeout(previousPendingDeletion.timerId);
      void confirmTaskDeletion(previousPendingDeletion.task.id);
    }

    const removedTask = removeTaskLocally(task.id);
    if (!removedTask) return;

    const timerId = window.setTimeout(() => {
      void confirmTaskDeletion(removedTask.task.id);
      pendingDeletionRef.current = null;
      setPendingDeletion(null);
    }, 4000);
    const nextPendingDeletion = {
      ...removedTask,
      timerId,
    };

    pendingDeletionRef.current = nextPendingDeletion;
    setPendingDeletion(nextPendingDeletion);
  };

  const handleUndoDelete = () => {
    const pending = pendingDeletionRef.current;
    if (!pending) return;

    window.clearTimeout(pending.timerId);
    restoreTaskLocally(pending.task, pending.index);
    pendingDeletionRef.current = null;
    setPendingDeletion(null);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTaskId(Number(active.id));
    setActiveTaskWidth(active.rect.current.initial?.width ?? null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!isTrashDropEnabled) {
      setIsOverTrash(false);
      return;
    }
    setIsOverTrash(over?.id === TASK_TRASH_ID);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setIsOverTrash(false);
    setActiveTaskId(null);
    setActiveTaskWidth(null);

    if (!over) return;

    if (over.id === TASK_TRASH_ID) {
      if (!isTrashDropEnabled) return;

      const taskToDelete = displayedTasks.find(
        (task) => task.id === Number(active.id)
      );
      if (taskToDelete) handleRequestDelete(taskToDelete);
      return;
    }

    if (active.id === over.id) return;

    const oldIndex = displayedTasks.findIndex(
      (task) => task.id === Number(active.id)
    );
    const newIndex = displayedTasks.findIndex(
      (task) => task.id === Number(over.id)
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedDisplayedTasks = arrayMove(displayedTasks, oldIndex, newIndex);
    const displayedTaskIds = new Set(displayedTasks.map((task) => task.id));
    let nextDisplayedTaskIndex = 0;

    setTasks(
      tasks.map((task) =>
        displayedTaskIds.has(task.id)
          ? reorderedDisplayedTasks[nextDisplayedTaskIndex++]
          : task
      )
    );
  };

  const handleDragCancel = () => {
    setIsOverTrash(false);
    setActiveTaskId(null);
    setActiveTaskWidth(null);
  };

  const handleEmptyClick = () => {
    onEmptyClick?.();
  };

  const handleEmptyKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onEmptyClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onEmptyClick();
  };

  return (
    <>
      {completionNotice && (
        <div
          role="status"
          className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
        >
          {completionNotice}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={displayedTasks.map((task) => task.id)}
          strategy={sortingStrategy}
        >
          <ul className={`${listContainerClass} list-none`}>
            <AnimatePresence>
              {displayedTasks.length ? (
                groupedTasks ? (
                  groupedTasks.map((group) => (
                    <div key={group.key} className="flex flex-col gap-3">
                      <GroupHeader label={group.label} />
                  {group.tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          toggle={toggle}
                          task={task}
                          onRequestDelete={handleRequestDelete}
                          isSelectionMode={isBulkSelectMode}
                          isSelected={selectedIds.has(task.id)}
                          onToggleSelected={() => toggleSelection(task.id)}
                          onRequestActualTime={setActualTimeTask}
                        />
                      ))}

                    </div>
                  ))
                ) : (
                  displayedTasks.map((task: Task) => (
                    <TaskItem
                      key={task.id}
                      toggle={toggle}
                      task={task}
                      onRequestDelete={handleRequestDelete}
                      isSelectionMode={isBulkSelectMode}
                      isSelected={selectedIds.has(task.id)}
                      onToggleSelected={() => toggleSelection(task.id)}
                      onRequestActualTime={setActualTimeTask}
                    />
                  ))

                )
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleEmptyClick}
                  onKeyDown={handleEmptyKeyDown}
                  role={onEmptyClick ? "button" : undefined}
                  tabIndex={onEmptyClick ? 0 : undefined}
                  className={`col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm outline-none transition-colors dark:border-slate-700/50 dark:bg-slate-800/20 dark:shadow-none ${
                    onEmptyClick
                      ? "cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/40"
                      : ""
                  }`}
                >
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {onlyActive ? "Нет активных задач" : "Список задач пуст"}
                  </h3>
                  <p className="max-w-62.5 text-sm text-slate-600 dark:text-slate-400">
                    {onlyActive
                      ? "Все текущие задачи выполнены! Отличный уровень баланса энергии."
                      : "Добавь свою первую задачу, чтобы запустить трекинг энергии"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={isOverTrash ? null : undefined}>
          {activeTask ? (
            <TaskDragOverlay task={activeTask} width={activeTaskWidth} />
          ) : null}
        </DragOverlay>

        <AnimatePresence>
          {activeTaskId !== null && isTrashDropEnabled && <TaskTrashDropZone />}
        </AnimatePresence>
      </DndContext>

        <AnimatePresence>
          {isBulkSelectMode && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-x-2 bottom-20 z-50 mx-auto flex max-w-3xl flex-col items-stretch gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 text-sm text-slate-900 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100 sm:inset-x-4 sm:flex-row sm:items-center sm:justify-between lg:bottom-6"
            >
              <span className="font-semibold">Выбрано: {visibleSelectedIds.size}</span>
              <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:items-center">
                <button onClick={handleBulkComplete} className="rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 sm:px-3 sm:text-sm">Выполнить</button>
                <button disabled={isBulkMoving} onClick={() => void handleBulkMove(getTomorrowDate())} className="rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800 sm:px-3 sm:text-sm">На завтра</button>
                <button disabled={isBulkMoving} onClick={() => setIsMoveDateOpen(true)} className="rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800 sm:px-3 sm:text-sm">Перенести</button>
                <button onClick={handleBulkDelete} className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 sm:px-3 sm:text-sm">Удалить</button>
                <button onClick={clearSelection} className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 sm:px-3 sm:text-sm">Отмена</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        <AnimatePresence>
          {pendingDeletion && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-2xl shadow-slate-900/15 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 dark:text-slate-100 dark:shadow-black/30 lg:bottom-6"
            role="status"
          >
            <span className="font-medium">Задача удалена</span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Вернуть
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <ActualTimePrompt
        key={actualTimeTask?.id ?? "closed"}
        isOpen={Boolean(actualTimeTask)}
        estimatedMinutes={actualTimeTask?.estimatedMinutes ?? null}
        onClose={() => setActualTimeTask(null)}
        onSave={saveActualTime}
      />
      <Modal
        isOpen={isMoveDateOpen}
        onClose={() => setIsMoveDateOpen(false)}
        title="Перенести задачи"
      >
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="bulk-move-date">
          Новая дата
        </label>
        <input
          id="bulk-move-date"
          type="date"
          value={bulkMoveDate}
          onChange={(event) => setBulkMoveDate(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setIsMoveDateOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Отмена</button>
          <button type="button" disabled={!bulkMoveDate || isBulkMoving} onClick={() => void handleBulkMove(bulkMoveDate)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{isBulkMoving ? "Переношу..." : "Перенести"}</button>
        </div>
      </Modal>
    </>
  );
};

export default TaskList;
