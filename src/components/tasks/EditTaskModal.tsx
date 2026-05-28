import {
  schemaTask,
  type EnergyLevel,
  type Priority,
  type SubTask,
  type Task,
} from "../../types";
import {
  useAddSubTask,
  useDeleteSubTask,
  useDeleteTask,
  useToggleSubTask,
  useUpdateTask,
} from "../../store/useTaskStore";
import { useTaskStore } from "../../store/useTaskStore";
import { useState } from "react";
import Modal from "../ui/Modal";
import { Trash2, Plus, CheckSquare, Square } from "lucide-react";

interface IDialog {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
}

const EditTaskModal = ({ isOpen, onClose, task }: IDialog) => {
  const [values, setValues] = useState<Task>({
    ...task,
    subtasks: task.subtasks ?? [],
  });
  const [subTitle, setSubTitle] = useState("");

  const updateTask = useUpdateTask();
  const remove = useDeleteTask();
  const addSubTask = useAddSubTask();
  const toggleSubTask = useToggleSubTask();
  const deleteSubTask = useDeleteSubTask();

  const refreshSubtasks = (taskId: number) => {
    const updated = useTaskStore
      .getState()
      .tasks.find((item: Task) => item.id === taskId);

    if (!updated) return;

    setValues((current) => ({
      ...current,
      id: updated.id,
      subtasks: updated.subtasks ?? [],
    }));
  };

  const handleAddSub = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) return;

    const createdSubTask = await addSubTask(values.id, subTitle.trim());
    if (!createdSubTask) return;

    setSubTitle("");
    refreshSubtasks(values.id);
  };

  const handleToggleSub = async (subId: number, currentStatus: boolean) => {
    const updatedSubTask = await toggleSubTask(subId, values.id, !currentStatus);
    if (!updatedSubTask) return;

    refreshSubtasks(updatedSubTask.taskId);
  };

  const handleDeleteSub = async (subId: number) => {
    await deleteSubTask(values.id, subId);

    refreshSubtasks(values.id);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!values.title.trim() || !values.category.trim()) {
      alert("Название и категория не могут быть пустыми!");
      return;
    }

    const parsedValues = schemaTask.safeParse(values);
    if (parsedValues.success) {
      const updatedTask = await updateTask(values.id, parsedValues.data);
      if (!updatedTask) return;

      const pendingSubTitle = subTitle.trim();
      if (pendingSubTitle) {
        const createdSubTask = await addSubTask(values.id, pendingSubTitle);
        if (!createdSubTask) return;
      }

      onClose();
    } else {
      alert("Поле не может быть пустым!");
    }
  };

  const deleteTask = (): void => {
    remove(values.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={"Редактировать задачу"}>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="text"
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={values.category}
          onChange={(e) => setValues({ ...values, category: e.target.value })}
          type="text"
          placeholder="Напишите категорию задачи"
        />

        <div className="border-t border-slate-800 pt-4 mt-2">
          <label className="text-[11px] sm:text-sm font-medium text-slate-400 mb-1.5 block">
            Подзадачи
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Добавить подзадачу..."
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddSub}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {values.subtasks?.map((sub: SubTask) => (
              <div
                key={sub.id}
                className="flex items-center justify-between bg-slate-900/40 border border-slate-800 p-2.5 rounded-xl"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSub(sub.id, sub.completed)}
                    className="text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {sub.completed ? (
                      <CheckSquare size={16} className="text-indigo-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <span
                    className={`text-sm truncate ${
                      sub.completed
                        ? "line-through text-slate-500"
                        : "text-slate-200"
                    }`}
                  >
                    {sub.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSub(sub.id)}
                  className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

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
          <button
            onClick={deleteTask}
            type="button"
            className="text-red-400 hover:text-red-300 cursor-pointer p-2 transition-colors"
          >
            Удалить
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTaskModal;
