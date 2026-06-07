import { Link } from "react-router-dom";
import TaskList from "../components/tasks/TaskList";
import SuccessStairs from "../dashboard/SuccessStairs";
import { useCurrentXP, useUserLevel } from "../store/useTaskStore";
import { EnergySlider } from "../components/layout/EnergySlider";
import MindHubChat from "../components/mind/MindHubChat";

const DashboardPage = () => {
  const currentLevel = useUserLevel();
  const currentXP = useCurrentXP();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Пункт управления
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Твой сфокусированный процесс на сегодня
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:items-stretch">
        <div className="xl:col-span-3 flex flex-col gap-6 xl:h-[calc(100vh-12rem)] xl:min-h-160 min-h-0">
          <Link
            to="/stairs"
            className="hidden cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none dark:hover:border-indigo-500/40 dark:hover:bg-slate-900/70 xl:flex flex-1 min-h-0"
            aria-label="Открыть лестницу успеха"
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                  Лестница успеха
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {currentXP} XP
                </p>
              </div>
            </div>
            <SuccessStairs currentLevel={currentLevel} visibleSteps={3} />
          </Link>

          <EnergySlider />
        </div>

        <div className="xl:col-span-5">
          <MindHubChat />
        </div>

        <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none xl:col-span-4 xl:h-[calc(100vh-12rem)] xl:min-h-160">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Твои задачи
            </h2>
            <Link
              to={"/tasks"}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Смотреть все ↗
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <TaskList onlyActive={true} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
