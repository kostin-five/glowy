import { Link } from "react-router-dom";
import { useName } from "../../store/useAuthStore";
import { useUserLevel } from "../../store/useTaskStore";
import { User } from "lucide-react";

const Header = () => {
  const name = useName();
  const currentLevel = useUserLevel();

  return (
    <header className="sticky top-0 z-50 flex w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
      <Link
        to="/dashboard"
        className=" items-center gap-2 hidden md:flex cursor-pointer"
      >
        <img
          src="/Glowy.png"
          alt="Логотип Glowy"
          className="w-10 h-10 object-contain"
        />
        <h2 className="font-display text-xl font-black tracking-tighter text-indigo-500 italic">
          GLOWY<span className="text-slate-900 dark:text-slate-200">.AI</span>
        </h2>
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
          <span className="text-xs font-bold text-indigo-300">
            Уровень: {currentLevel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/70 px-2.5 py-1 dark:border-slate-700/50 dark:bg-slate-800/60">
          <User size={14} className="text-slate-600 dark:text-slate-400" />
          <span className="max-w-20 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
            {name}
          </span>
        </div>

      </div>
    </header>
  );
};

export default Header;
