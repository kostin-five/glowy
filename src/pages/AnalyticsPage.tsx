import useTaskStats from "../hooks/useTaskStats";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useTasks } from "../store/useTaskStore";

const AnalyticsPage = () => {
  const { countTasks, calcCompletedTasks, progressPercent } = useTaskStats();
  const tasks = useTasks();

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
  const categoryMap = tasks.reduce<Record<string, number>>((acc, task) => {
    const category = (task.category || "Без категории").trim() || "Без категории";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {
    Работа: 0,
    Учеба: 0,
    Быт: 0,
    Здоровье: 0,
  });
  const categoryData = Object.entries(categoryMap)
    .map(([category, value]) => ({
      category,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 md:px-8">
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Распределение по энергии
          </h2>
          <div className="mt-4 h-[350px] w-full">
            {energyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyData}
                    cx="50%"
                    cy="50%"
                    innerRadius="34%"
                    outerRadius="48%"
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
              <div className="flex h-full w-full items-center justify-center text-slate-500 italic">
                Добавь задачи, чтобы увидеть график
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Баланс сфер жизни
          </h2>
          <div className="mt-4 h-[350px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    allowDecimals={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Radar
                    dataKey="value"
                    name="Задачи"
                    stroke="#818cf8"
                    fill="#818cf8"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-500 italic">
                Добавь категории, чтобы увидеть баланс
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
};

export default AnalyticsPage;
