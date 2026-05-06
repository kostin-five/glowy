import { create } from "zustand";
import type { Task } from "../types";

interface TaskStore {
  tasks: Task[];
  createTask: (newTask: Task) => void;
  deleteTask: (id: number) => void;
  toggleTask: (id: number) => void;
}

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

export const useTaskStore = create<TaskStore>()((set) => ({
  tasks: initialTasks,
  createTask: (newTask: Task) =>
    set((state) => ({
      tasks: [...state.tasks, newTask],
    })),
  deleteTask: (id: number) =>
    set((state) => ({
      tasks: state.tasks.filter((t: Task): boolean => t.id !== id),
    })),
  toggleTask: (id: number) =>
    set((state) => ({
      tasks: state.tasks.map(
        (t: Task): Task => (t.id === id ? { ...t, completed: !t.completed } : t)
      ),
    })),
}));
