// import React from "react";
import { useDeleteTask, useTasks, useToggleTask } from "../store/useTaskStore";
import type { Task } from "../types";
import TaskItem from "./TaskItem";

const TaskList = () => {
  const tasks = useTasks();

  return (
    <ul className="flex flex-col list-none">
      {tasks.map((task: Task) => (
        <TaskItem
          key={task.id}
          toggle={useToggleTask}
          remove={useDeleteTask}
          task={task}
        />
      ))}
    </ul>
  );
};

export default TaskList;
