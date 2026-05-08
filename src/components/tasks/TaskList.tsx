import { useDeleteTask, useToggleTask } from "../../store/useTaskStore";
import type { Task } from "../../types";
import TaskItem from "./TaskItem";
import { useProcessedTasks } from "../../hooks/useProcessedTasks";
import SortMenu from "../ui/SortMenu";
import TaskFilter from "./TaskFilter";

const TaskList = () => {
  const remove = useDeleteTask();
  const toggle = useToggleTask();

  const processedTasks = useProcessedTasks();

  return (
    <>
      <SortMenu />
      <TaskFilter />
      <ul className="flex flex-col list-none">
        {processedTasks.map((task: Task) => (
          <TaskItem key={task.id} toggle={toggle} remove={remove} task={task} />
        ))}
      </ul>
    </>
  );
};

export default TaskList;
