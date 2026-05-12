import useTaskStats from "../hooks/useTaskStats";

const AnalyticsPage = () => {
  const { countTasks, calcCompletedTasks, progressPercent } = useTaskStats();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-slate-100">Твоя аналитика</h1>
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          Всего задач:{" "}
          <span className="text-5xl font-bold text-indigo-400">
            {countTasks}
          </span>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          Выполнено:{" "}
          <span className="text-5xl font-bold text-indigo-400">
            {calcCompletedTasks}
          </span>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          Прогресс:{" "}
          <span className="text-5xl font-bold text-indigo-400">
            {progressPercent}%
          </span>
        </div>
      </section>
    </section>
  );
};

export default AnalyticsPage;
