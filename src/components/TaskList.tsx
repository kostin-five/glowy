// import React from "react";
import type { Task } from "../types";
import TaskItem from "./TaskItem";

const TaskList = ({
  tasks,
  remove,
  toggle,
}: {
  tasks: Task[];
  remove: (id: number) => void;
  toggle: (id: number) => void;
}) => {
  return (
    <ul className="flex flex-col list-none">
      {tasks.map((task: Task) => (
        <TaskItem key={task.id} toggle={toggle} remove={remove} task={task} />
      ))}
    </ul>
  );
};

export default TaskList;
