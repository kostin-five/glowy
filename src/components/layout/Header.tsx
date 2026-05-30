import { Link } from "react-router-dom";
import { useName } from "../../store/useAuthStore";
import { LogOut, User } from "lucide-react";

const Header = () => {
  const name = useName();

  const handleLogout = () => {
    localStorage.removeItem("auth-storage");
    window.location.pathname = "/";
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 lg:hidden">
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
          GLOWY<span className="text-slate-200">.AI</span>
        </h2>
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 border border-slate-700/50 rounded-xl">
          <User size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-200 truncate max-w-20">
            {name}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-400 active:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-slate-800/40"
          title="Выйти"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default Header;
