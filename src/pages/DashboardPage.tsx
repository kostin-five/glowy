import { Link } from "react-router-dom";
import TaskList from "../components/tasks/TaskList";
import SuccessStairs from "../dashboard/SuccessStairs";
import { useCurrentXP, useIsLoading, useUserLevel } from "../store/useTaskStore";
import Spinner from "../components/ui/Spinner";
import { EnergySlider } from "../components/layout/EnergySlider";

const DashboardPage = () => {
  const currentLevel = useUserLevel();
  const currentXP = useCurrentXP();
  const isLoading = useIsLoading();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-slate-100">
          Пункт управления
        </h1>
        <p className="text-slate-400 mt-1">
          Твой сфокусированный процесс на сегодня
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:items-stretch">
        <div className="xl:col-span-3 flex flex-col gap-6 xl:h-[calc(100vh-12rem)] xl:min-h-160 min-h-0">
          <Link
            to="/stairs"
            className="hidden xl:flex bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex-col flex-1 min-h-0 overflow-hidden cursor-pointer transition-colors hover:border-indigo-500/40 hover:bg-slate-900/70"
            aria-label="Открыть лестницу успеха"
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-200">
                  Лестница успеха
                </h2>
                <p className="text-xs text-slate-500 mt-1">{currentXP} XP</p>
              </div>
            </div>
            <SuccessStairs currentLevel={currentLevel} visibleSteps={3} />
          </Link>

          <EnergySlider />
        </div>

        <section className="xl:col-span-5 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col xl:h-[calc(100vh-12rem)] xl:min-h-160 min-h-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-slate-200">
              Хаб мыслей
            </h2>
          </div>
          <div className="flex-1 min-h-0 rounded-2xl border border-slate-800/70 bg-slate-950/20" />
        </section>

        <section className="xl:col-span-4 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col xl:h-[calc(100vh-12rem)] xl:min-h-160">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold text-slate-200">
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
            {isLoading ? <Spinner /> : <TaskList onlyActive={true} />}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
