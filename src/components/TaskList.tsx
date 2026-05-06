// import React from "react";
import { useTaskStore } from "../store/useTaskStore";
import type { Task } from "../types";
import TaskItem from "./TaskItem";

const TaskList = () => {
  const tasks = useTaskStore((state) => state.tasks);
  const remove = useTaskStore((state) => state.deleteTask);
  const toggle = useTaskStore((state) => state.toggleTask);

  return (
    <ul className="flex flex-col list-none">
      {tasks.map((task: Task) => (
        <TaskItem key={task.id} toggle={toggle} remove={remove} task={task} />
      ))}
    </ul>
  );
};

export default TaskList;
