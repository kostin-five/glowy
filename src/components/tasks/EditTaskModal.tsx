import type { Task } from "../../types";
import {
  useUpdateTask,
  type EnergyLevel,
  type Priority,
} from "../../store/useTaskStore";
import { useState } from "react";
import Modal from "../ui/Modal";

interface IDialog {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

const EditTaskModal = ({ isOpen, onClose, task }: IDialog) => {
  const [values, setValues] = useState<Task>(task);
  const updateTask = useUpdateTask();

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTask(task.id, values);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={"Редактировать"}>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="text"
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
        />
        <div className="flex sm:flex-row flex-col gap-4 w-full">
          <div className="flex-1">
            <input
              className="w-full h-11.5 bg-slate-900 border border-slate-700 rounded-xl px-4 text-slate-200 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none scheme-dark"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <select
              className="w-full h-11.5 bg-slate-900 border border-slate-700 rounded-xl px-4 text-slate-200 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 
                 transition-all appearance-none cursor-pointer"
              value={values.priority}
              onChange={(e) =>
                setValues({ ...values, priority: e.target.value as Priority })
              }
            >
              <option value="Важно">Важно</option>
              <option value="Нормально">Нормально</option>
              <option value="Не срочно">Не срочно</option>
            </select>
          </div>
        </div>
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
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={values.category}
          onChange={(e) => setValues({ ...values, category: e.target.value })}
          type="text"
          placeholder="Напишите категорию задачи"
        />
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
            onClick={() => onClose()}
            type="button"
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors"
            type="submit"
          >
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTaskModal;
