// import React from "react";
import { useDeleteTask, useTasks, useToggleTask } from "../store/useTaskStore";
import type { Task } from "../types";
import TaskItem from "./TaskItem";

const TaskList = () => {
  const tasks = useTasks();
  const remove = useDeleteTask();
  const toggle = useToggleTask();

  return (
    <ul className="flex flex-col list-none">
      {tasks.map((task: Task) => (
        <TaskItem key={task.id} toggle={toggle} remove={remove} task={task} />
      ))}
    </ul>
  );
};

export default TaskList;
