import { Link } from "react-router-dom";
import TaskList from "../components/tasks/TaskList";

const DashboardPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-100">
          ПУНКТ УПРАВЛЕНИЯ
        </h1>
        <p className="text-slate-400 mt-1">
          Твой сфокусированный процесс на сегодня
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-3 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col h-full min-h-100">
          <h2 className="text-xl font-bold text-slate-200 mb-6">Путь Glowy</h2>
          <div className="flex-1 border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 italic">
            Здесь будет "Лестница успеха"
          </div>
        </section>

        <section className="xl:col-span-5 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col h-full min-h-100">
          <h2 className="text-xl font-bold text-slate-200 mb-6">
            Хаб выгрузки мыслей
          </h2>
          <div className="flex-1 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 italic">
            Привет, Алекс. Найди свой вайб.
            <br />
            (Место для ИИ)
          </div>
        </section>

        <section className="xl:col-span-4 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col h-full min-h-25 max-h-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-200">Твои задачи</h2>
            <Link
              to={"/tasks"}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Смотреть все ↗
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <TaskList />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
