import { useSetTasks, useTasks, useToggleTask } from "../../store/useTaskStore";
import type { Task } from "../../types";
import TaskItem from "./TaskItem";
import { useProcessedTasks } from "../../hooks/useProcessedTasks";
import { AnimatePresence, motion } from "framer-motion";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface TaskListProps {
  onlyActive?: boolean;
}

const TaskList = ({ onlyActive = false }: TaskListProps) => {
  const toggle = useToggleTask();
  const tasks = useTasks();
  const setTasks = useSetTasks();
  const processedTasks = useProcessedTasks();
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
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

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayedTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col list-none">
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
      </DndContext>
    </>
  );
};

export default TaskList;
