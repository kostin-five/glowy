// import React from "react";

import { useTaskStore } from "../store/useTaskStore";

const ProgressPage = () => {
  const tasks = useTaskStore((state) => state.tasks);

  return (
    <section className="flex flex-col gap-6 px-16 mt-10">
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          Всего задач:{" "}
          <span className="text-5xl font-bold text-indigo-400">
            {tasks.length}
          </span>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          Выполнено:{" "}
          <span className="text-5xl font-bold text-indigo-400">
            {tasks.filter((task) => task.completed).length}
          </span>
        </div>
      </section>
    </section>
  );
};

export default ProgressPage;
