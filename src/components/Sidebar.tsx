// import React from "react";
import { Link } from "react-router-dom";
import { useTasks } from "../store/useTaskStore";

const Sidebar = () => {
    const tasks = useTasks();
    

  return (
    <aside className="flex flex-col gap-4 p-6 text-slate-300 h-screen w-64 border-r border-slate-800 bg-slate-900/50">
      <Link className="hover:text-indigo-400 transition-colors" to={"/"}>
        Задачи
      </Link>
      <Link
        className="hover:text-indigo-400 transition-colors"
        to={"/progress"}
      >
        Прогресс
      </Link>
      <div>{tasks.length}</div>
    </aside>
  );
};

export default Sidebar;
