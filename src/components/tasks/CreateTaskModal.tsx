import { useState } from "react";
import {
  useCreateTask,
} from "../../store/useTaskStore";
import { schemaTask, type EnergyLevel, type Priority, type Task } from "../../types";
import Modal from "../ui/Modal";

interface ICreateModal {
  isOpen: boolean;
  onClose: () => void;
}

const CreateTaskForm = ({ isOpen, onClose }: ICreateModal) => {
  const [values, setValues] = useState<Task>({
    id: 0,
    title: "",
    date: "",
    priority: "⚡️ P2",
    category: "",
    completed: false,
    energyLevel: "med",
  });

  const clean = () => {
    setValues({
      id: 0,
      title: "",
      date: "",
      priority: "⚡️ P2",
      category: "",
      completed: false,
      energyLevel: "med",
    });
  };

  const create = useCreateTask();

  const sendTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!values.title.trim() || !values.category.trim()) {
      alert("Название и категория не могут быть пустыми!");
      return;
    }

    const parsedValues = schemaTask.safeParse(values);
    if (parsedValues.success) {
      create({ ...parsedValues.data, id: Date.now() });
    } else {
      alert("Поле не может быть пустым!");
    }
    clean();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать задачу">
      <form
        className="flex flex-col
       w-full gap-4
       "
        onSubmit={sendTask}
      >
        <input
          className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          type="text"
          placeholder="Введите задачу"
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
        />
        <div className="flex sm:flex-row flex-col gap-4 w-full">
          <div className="flex-1">
            <label className="text-[11px] sm:text-xs font-medium text-slate-400 mb-1.5 block">
              Дата задачи
            </label>
            <input
              className="w-full h-11.5 bg-slate-900 border border-slate-700 rounded-xl px-4 text-slate-200 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none scheme-dark"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>
          <div className="flex-1 relative">
            <label className="text-[11px] sm:text-xs font-medium text-slate-400 mb-1.5 block">
              Приоритет
            </label>
            <div className="relative">
              <select
                className="w-full h-11.5 bg-slate-900 border border-slate-700 rounded-xl px-4 text-slate-200 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none cursor-pointer pr-10"
                value={values.priority}
                onChange={(e) =>
                  setValues({ ...values, priority: e.target.value as Priority })
                }
              >
                <option value="🔥 P1">🔥 Высокий</option>
                <option value="⚡️ P2">⚡️ Средний</option>
                <option value="💤 P3">💤 Низкий</option>
              </select>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        <div className="text-slate-200">
          <p className="text-sm font-medium text-slate-400 mb-2">
            Энергозатратность задачи:
          </p>
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
              Низкая
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
              Средняя
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
              Высокая
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
    </Modal>
  );
};

export default CreateTaskForm;
