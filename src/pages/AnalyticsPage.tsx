import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import { useTasks } from "../store/useTaskStore";
import type { Task } from "../types";
import { parseTaskDateToLocalDay } from "../utils/taskDateGroups";

type WeekOffset = 0 | 1 | 2 | 3;
type TaskWithTimestamps = Task & {
  createdAt?: string;
  updatedAt?: string;
};

const weekOptions: Array<{ offset: WeekOffset; label: string }> = [
  { offset: 0, label: "Текущая неделя" },
  { offset: 1, label: "Прошлая" },
  { offset: 2, label: "2 недели назад" },
  { offset: 3, label: "3 недели назад" },
];

const weekDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const getWeekStart = (offset: WeekOffset): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceFromMonday - offset * 7);

  return monday;
};

const parseAnalyticsDate = (task: TaskWithTimestamps): Date | null => {
  const timestamp = task.updatedAt || task.createdAt;

  if (timestamp) {
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }

  return parseTaskDateToLocalDay(task.date);
};

const tooltipStyles = {
  backgroundColor: "#0f172a",
  borderColor: "#1e293b",
  borderRadius: "12px",
  color: "#f8fafc",
};

const AnalyticsPage = () => {
  const tasks = useTasks() as TaskWithTimestamps[];
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<WeekOffset>(0);
  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  );

  const energyData = useMemo(
    () =>
      [
        {
          name: "Высокая",
          value: activeTasks.filter((task) => task.energyLevel === "high").length,
          color: "#ef4444",
        },
        {
          name: "Средняя",
          value: activeTasks.filter((task) => task.energyLevel === "med").length,
          color: "#eab308",
        },
        {
          name: "Низкая",
          value: activeTasks.filter((task) => task.energyLevel === "low").length,
          color: "#3b82f6",
        },
      ].filter((item) => item.value > 0),
    [activeTasks]
  );

  const categoryData = useMemo(() => {
    const categoryMap = activeTasks.reduce<Record<string, number>>((acc, task) => {
      const category = (task.category || "Без категории").trim() || "Без категории";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryMap)
      .map(([category, value]) => ({
        category,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [activeTasks]);

  const weeklyCompletedData = useMemo(() => {
    const weekStart = getWeekStart(selectedWeekOffset);

    return weekDayLabels.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);

      const value = tasks.filter((task) => {
        if (!task.completed) return false;

        const completedDate = parseAnalyticsDate(task);
        if (!completedDate) return false;

        return completedDate.getTime() === date.getTime();
      }).length;

      return {
        day,
        dateLabel: `${date.getDate()} ${monthNames[date.getMonth()]}`,
        value,
      };
    });
  }, [selectedWeekOffset, tasks]);

  const hasWeeklyProgress = weeklyCompletedData.some((item) => item.value > 0);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 pb-28 sm:px-4 md:gap-6 md:px-8 lg:pb-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Твоя аналитика
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Картина нагрузки строится по активным задачам, а движение недели — по выполненным.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
              Выполненные задачи за неделю
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
              Переключай последние четыре недели и смотри, где был реальный прогресс.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60 sm:grid-cols-4">
            {weekOptions.map((option) => {
              const isActive = selectedWeekOffset === option.offset;

              return (
                <button
                  key={option.offset}
                  type="button"
                  onClick={() => setSelectedWeekOffset(option.offset)}
                  className={`h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-500 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 h-64 w-full outline-none [&_*]:outline-none [&_.recharts-active-bar]:hidden [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none sm:h-72">
          {hasWeeklyProgress ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyCompletedData}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                accessibilityLayer={false}
              >
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={false}
                  contentStyle={tooltipStyles}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload as
                      | { day?: string; dateLabel?: string }
                      | undefined;

                    return item?.day && item?.dateLabel
                      ? `${item.day}, ${item.dateLabel}`
                      : "";
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Выполнено"
                  radius={[8, 8, 0, 0]}
                  fill="#818cf8"
                  activeBar={false}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              В выбранной неделе пока нет выполненных задач
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none md:p-6">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
            Распределение активных задач по энергии
          </h2>
          <div className="mt-3 h-64 w-full sm:h-72 md:mt-4">
            {energyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyData}
                    cx="50%"
                    cy="48%"
                    innerRadius="34%"
                    outerRadius="50%"
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {energyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyles} itemStyle={{ color: "#e2e8f0" }} />
                  <Legend verticalAlign="bottom" height={40} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Нет активных задач для распределения энергии
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50 dark:shadow-none md:p-6">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
            Баланс активных задач по сферам жизни
          </h2>
          <div className="mt-3 h-64 w-full sm:h-72 md:mt-4">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <PolarRadiusAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Radar
                    dataKey="value"
                    name="Активные задачи"
                    stroke="#818cf8"
                    fill="#818cf8"
                    fillOpacity={0.5}
                  />
                  <Tooltip contentStyle={tooltipStyles} itemStyle={{ color: "#e2e8f0" }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Нет активных категорий для баланса
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-indigo-900 dark:text-indigo-100 md:flex-row md:items-center md:gap-4 md:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold sm:text-base">
            AI-анализ недели скоро появится
          </h2>
          <p className="mt-1 text-sm text-indigo-900/70 dark:text-indigo-100/70">
            Здесь Glowy будет помогать замечать перегруз, прогресс и повторяющиеся задачи.
          </p>
        </div>
      </section>
    </section>
  );
};

export default AnalyticsPage;
