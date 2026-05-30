import useTaskStats from "../hooks/useTaskStats";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
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


  return (
    <section className="flex flex-col gap-8 max-w-5xl mx-auto w-full px-4 md:px-8">
      <h1 className="font-display text-3xl font-bold text-slate-100">
        Твоя аналитика
      </h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
          <span className="text-sm text-slate-400 font-medium mb-1">
            Всего задач
          </span>
          <span className="font-display text-5xl font-black text-indigo-400">
            {countTasks}
          </span>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
          <span className="text-sm text-slate-400 font-medium mb-1">
            Выполнено
          </span>
          <span className="font-display text-5xl font-black text-emerald-400">
            {calcCompletedTasks}
          </span>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 flex flex-col justify-center">
          <span className="text-sm text-slate-400 font-medium mb-1">
            Прогресс
          </span>
          <span className="font-display text-5xl font-black text-indigo-400">
            {progressPercent}%
          </span>
        </div>
      </section>

      <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 h-100 flex flex-col">
        <h2 className="font-display text-lg font-bold text-slate-200 mb-4">
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
