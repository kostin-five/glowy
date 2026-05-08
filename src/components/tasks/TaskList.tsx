import { useDeleteTask, useToggleTask } from "../../store/useTaskStore";
import type { Task } from "../../types";
import TaskItem from "./TaskItem";
import useFilteredTasks from "../../hooks/useProcessedTasks";

const TaskList = () => {
  const remove = useDeleteTask();
  const toggle = useToggleTask();

  const filteredTasks = useFilteredTasks();

  return (
    <>
      <ul className="flex flex-col list-none">
        {filteredTasks.map((task: Task) => (
          <TaskItem key={task.id} toggle={toggle} remove={remove} task={task} />
        ))}
      </ul>
    </>
  );
};

export default TaskList;
