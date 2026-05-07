// import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  return (
    <aside className="flex flex-col h-screen border-r border-slate-800 bg-slate-900 p-6">
      <div className="mb-12 px-2 select-none flex items-center gap-3">
        <img
          src="/Glowy.png"
          alt="Логотип Glowy"
          className="w-10 h-10 object-contain"
        />
        <h2 className="text-2xl font-black tracking-tighter text-indigo-500 italic">
          GLOWY<span className="text-slate-200">.AI</span>
        </h2>
      </div>

      <nav className="flex flex-col gap-2">
        <Link
          className={`px-4 py-3 rounded-xl transition-all font-medium ${
            location.pathname === "/"
              ? "text-indigo-400 bg-indigo-500/10"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          to={"/"}
        >
          Задачи
        </Link>
        <Link
          className={`px-4 py-3 rounded-xl transition-all font-medium ${
            location.pathname === "/progress"
              ? "text-indigo-400 bg-indigo-500/10"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          to={"/progress"}
        >
          Прогресс
        </Link>
      </nav>

      <div className="mt-auto flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
        <img
          src=""
          alt="аватар"
          className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 shrink-0"
        />
        <p className="text-sm font-medium text-slate-200">Иван Иванов</p>
      </div>
    </aside>
  );
};

export default Sidebar;
