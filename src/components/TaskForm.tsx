import { useState } from "react";
import type { Task } from "../types";

const TaskForm = ({ create }: { create: (task: Task) => void }) => {
  type Priority = "Важно" | "Нормально" | "Не срочно";
  const [title, setTitle] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("Нормально");
  const [category, setCategory] = useState<string>("");

  const sendTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    create({
      id: Date.now(),
      title: title,
      date: date,
      priority: priority,
      category: category,
      completed: false,
    });
    setTitle("");
    setDate("");
    setPriority("Нормально");
    setCategory("");
  };

  return (
    <form
      className="flex flex-col mx-auto rounded w-full gap-4 mt-10 bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 shadow-lg"
      onSubmit={sendTask}
    >
      <input
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        type="text"
        placeholder="Введите задачу"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        type="date"
        value={date}
        placeholder="Выбирете дату"
        onChange={(e) => setDate(e.target.value)}
      />
      <select
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
      >
        <option value="" disabled>
          Выбирете категорию
        </option>
        <option value="Важно">Важно</option>
        <option value="Нормально">Нормально</option>
        <option value="Не срочно">Не срочно</option>
      </select>
      <input
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        type="text"
        placeholder="Напишите категорию задачи"
      />
      <button
        className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg p-2.5 font-medium transition-colors w-full mt-2 cursor-pointer"
        type="submit"
      >
        Добавить
      </button>
    </form>
  );
};

export default TaskForm;
