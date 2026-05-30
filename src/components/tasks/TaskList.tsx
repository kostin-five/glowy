import { useState } from "react";
import { useSetTasks, useTasks, useToggleTask } from "../../store/useTaskStore";
import type { SubTask, Task } from "../../types";
import TaskItem from "./TaskItem";
import { useProcessedTasks } from "../../hooks/useProcessedTasks";
import { AnimatePresence, motion } from "framer-motion";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckSquare, ListChecks, Square } from "lucide-react";

interface TaskListProps {
  onlyActive?: boolean;
}

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
    : "text-slate-200";

  return (
    <div
      style={{ width: width ?? undefined }}
      className={`flex flex-col border-l-4 ${
        task.energyLevel === "high"
          ? "bg-red-500/20 border-l-red-500"
          : task.energyLevel === "med"
          ? "bg-yellow-500/20 border-l-yellow-500"
          : "bg-green-500/30 border-l-green-500"
      } p-4 rounded-xl shadow-2xl ring-1 ring-indigo-400/20 cursor-grabbing`}
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
            <span className={`px-2 py-1 border border-slate-600 rounded-md ${contentStyles}`}>
              {task.priority}
            </span>
            {category && (
              <span className={`px-2 py-1 border border-slate-600 rounded-md ${contentStyles}`}>
                {category}
              </span>
            )}
          </div>
        </div>
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3 pl-9 flex flex-col gap-2 border-t border-slate-800/50 pt-2.5">
          {task.subtasks.map((sub: SubTask) => (
            <div key={sub.id} className="flex items-center gap-2 text-xs text-slate-300">
              {sub.completed ? (
                <CheckSquare size={14} className="text-indigo-400" />
              ) : (
                <Square size={14} className="text-slate-500" />
              )}
              <span
                className={`truncate ${
                  sub.completed ? "line-through text-slate-500" : "text-slate-300"
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

const TaskList = ({ onlyActive = false }: TaskListProps) => {
  const toggle = useToggleTask();
  const tasks = useTasks();
  const setTasks = useSetTasks();
  const processedTasks = useProcessedTasks();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeTaskWidth, setActiveTaskWidth] = useState<number | null>(null);
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

  const displayedTasks = onlyActive
    ? processedTasks.filter((task: Task) => !task.completed)
    : processedTasks;
  const activeTask = activeTaskId
    ? displayedTasks.find((task) => task.id === activeTaskId) ?? null
    : null;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTaskId(Number(active.id));
    setActiveTaskWidth(active.rect.current.initial?.width ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTaskId(null);
    setActiveTaskWidth(null);

    if (!over || active.id === over.id) return;

    const oldIndex = displayedTasks.findIndex((task) => task.id === active.id);
    const newIndex = displayedTasks.findIndex((task) => task.id === over.id);

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
    setActiveTaskId(null);
    setActiveTaskWidth(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={displayedTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-3 list-none">
            <AnimatePresence>
              {displayedTasks.length ? (
                displayedTasks.map((task: Task) => (
                  <TaskItem key={task.id} toggle={toggle} task={task} />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/20 text-center"
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
                  <h3 className="text-lg font-bold text-slate-200 mb-1">
                    {onlyActive ? "Нет активных задач" : "Список задач пуст"}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-62.5">
                    {onlyActive
                      ? "Все текущие задачи выполнены! Отличный уровень баланса энергии."
                      : "Добавь свою первую задачу, чтобы запустить трекинг энергии"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <TaskDragOverlay task={activeTask} width={activeTaskWidth} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export default TaskList;
