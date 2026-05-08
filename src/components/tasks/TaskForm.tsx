import { useState } from "react";
import { useCreateTask } from "../../store/useTaskStore";
import { schemaTask, type Task } from "../../types";

type Priority = "Важно" | "Нормально" | "Не срочно";
type EnergyLevel = "low" | "med" | "high";

const TaskForm = () => {
  const [values, setValues] = useState<Task>({
    id: 0,
    title: "",
    date: "",
    priority: "Нормально",
    category: "",
    completed: false,
    energyLevel: "med",
  });

  const clean = () => {
    setValues({
      id: 0,
      title: "",
      date: "",
      priority: "Нормально",
      category: "",
      completed: false,
      energyLevel: "med",
    });
  };

  const create = useCreateTask();

  const sendTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedValues = schemaTask.safeParse(values);
    if (parsedValues.success) {
      create({ ...parsedValues.data, id: Date.now() });
    } else {
      alert("Поле не может быть пустым!");
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
      <div className="text-slate-200">
        <p>Уровень энергии:</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
            <input
              className="accent-indigo-500"
              type="radio"
              value={"low"}
              name="energy"
              checked={values.energyLevel === "low"}
              onChange={(e) =>
                setValues({
                  ...values,
                  energyLevel: e.target.value as EnergyLevel,
                })
              }
            />
            Низкий
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
            <input
              className="accent-indigo-500"
              type="radio"
              value={"med"}
              name="energy"
              checked={values.energyLevel === "med"}
              onChange={(e) =>
                setValues({
                  ...values,
                  energyLevel: e.target.value as EnergyLevel,
                })
              }
            />
            Средний
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
            <input
              className="accent-indigo-500"
              type="radio"
              value={"high"}
              name="energy"
              checked={values.energyLevel === "high"}
              onChange={(e) =>
                setValues({
                  ...values,
                  energyLevel: e.target.value as EnergyLevel,
                })
              }
            />
            Высокий
          </label>
        </div>
      </div>
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
