import { useDeleteTask, useToggleTask } from "../../store/useTaskStore";
import type { Task } from "../../types";
import TaskItem from "./TaskItem";
import { useProcessedTasks } from "../../hooks/useProcessedTasks";
import { AnimatePresence } from "framer-motion";
import TaskControls from "./TaskControls";

const TaskList = () => {
  const remove = useDeleteTask();
  const toggle = useToggleTask();

  const processedTasks = useProcessedTasks();

  return (
    <>
      <TaskControls />
      <ul className="flex flex-col list-none">
        <AnimatePresence>
          {processedTasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              toggle={toggle}
              remove={remove}
              task={task}
            />
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
};

export default TaskList;
