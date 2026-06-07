import useTaskStats from "../hooks/useTaskStats";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import SuccessStairs from "../dashboard/SuccessStairs";
import { useCurrentXP, useTasks, useUserLevel } from "../store/useTaskStore";

const AnalyticsPage = () => {
  const { countTasks, calcCompletedTasks, progressPercent } = useTaskStats();
  const tasks = useTasks();
  const currentLevel = useUserLevel();
  const currentXP = useCurrentXP();

  const energyData = [
    {
      name: "Высокая",
      value: tasks.filter((t) => t.energyLevel === "high").length,
      color: "#ef4444",
    },
    {
      name: "Средняя",
      value: tasks.filter((t) => t.energyLevel === "med").length,
      color: "#eab308",
    },
    {
      name: "Низкая",
      value: tasks.filter((t) => t.energyLevel === "low").length,
      color: "#3b82f6",
    },
  ].filter((item) => item.value > 0);


  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 md:px-8">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
        Твоя аналитика
      </h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
          <span className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Всего задач
          </span>
          <span className="font-display text-5xl font-black text-indigo-400">
            {countTasks}
          </span>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
          <span className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Выполнено
          </span>
          <span className="font-display text-5xl font-black text-emerald-400">
            {calcCompletedTasks}
          </span>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
          <span className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Прогресс
          </span>
          <span className="font-display text-5xl font-black text-indigo-400">
            {progressPercent}%
          </span>
        </div>
      </section>

      <section className="hidden min-h-125 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none md:flex">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Лестница успеха
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {currentXP} XP
            </p>
          </div>
          <span className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
            Уровень: {currentLevel}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <SuccessStairs currentLevel={currentLevel} visibleSteps={5} />
        </div>
      </section>

      <section className="flex h-100 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          Распределение по энергии
        </h2>
        <div className="flex-1 w-full">
          {energyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={energyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {energyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    borderRadius: "12px",
                    color: "#f8fafc",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 italic">
              Добавь задачи, чтобы увидеть график
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

export default AnalyticsPage;
