// import React, { useState } from "react";

import { useState } from "react";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import type { Task } from "../types";

const TaskPage = () => {
  const initialTasks: Task[] = [
    {
      id: 1,
      title: "Настроить Zustand для стейта",
      date: "2026-05-03",
      priority: "Важно",
      category: "Разработка",
      completed: false,
    },
    {
      id: 2,
      title: "Сделать тег v0.1.0",
      date: "2026-05-02",
      priority: "Нормально",
      category: "Git",
      completed: false,
    },
  ];

  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const createTask = (newTask: Task) => {
    setTasks([...tasks, newTask]);
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const toggleTask = (id: number) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="flex flex-col gap-8 px-15 max-w-5xl mx-auto w-full">
      <TaskForm create={createTask} />
      <TaskList toggle={toggleTask} tasks={tasks} remove={deleteTask} />
    </div>
  );
};

export default TaskPage;
