import { useState } from "react";
import { useCreateTask } from "../store/useTaskStore";
import { schemaTask, type Task } from "../types";

const TaskForm = () => {
  const [values, setValues] = useState<Task>({
    id: 0,
    title: "",
    date: "",
    priority: "Нормально",
    category: "",
    completed: false,
  });
  type Priority = "Важно" | "Нормально" | "Не срочно";

  const clean = () => {
    setValues({
      id: 0,
      title: "",
      date: "",
      priority: "Нормально",
      category: "",
      completed: false,
    });
  };

  const create = useCreateTask();

  const sendTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedValues = schemaTask.safeParse(values);
    if (parsedValues.success) {
      create({ ...parsedValues.data, id: Date.now() });
    } else {
      alert("Название задачи не может быть пустым!");
    }
    clean();
  };

  return (
    <form
      className="flex flex-col mx-auto rounded
       w-full gap-4 mt-10 bg-slate-800/50
       backdrop-blur-sm border border-slate-700 p-6 shadow-lg"
      onSubmit={sendTask}
    >
      <input
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        type="text"
        placeholder="Введите задачу"
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
      />
      <input
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors scheme-dark"
        type="date"
        value={values.date}
        onChange={(e) => setValues({ ...values, date: e.target.value })}
      />
      <select
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        value={values.priority}
        onChange={(e) =>
          setValues({ ...values, priority: e.target.value as Priority })
        }
      >
        <option value="" disabled>
          Выберете категорию
        </option>
        <option value="Важно">Важно</option>
        <option value="Нормально">Нормально</option>
        <option value="Не срочно">Не срочно</option>
      </select>
      <input
        className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        value={values.category}
        onChange={(e) => setValues({ ...values, category: e.target.value })}
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
