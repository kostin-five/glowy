import { Link, useLocation, type Location } from "react-router-dom";
import {
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  User,
} from "lucide-react";
import { useName } from "../../store/useAuthStore";
import { useIsDarkMode } from "../../store/useSettingsStore";

const SidebarContent = ({ location }: { location: Location }) => {
  const isDarkMode = useIsDarkMode();
  const menuItems = [
    { to: "/dashboard", label: "Пункт управления", icon: LayoutDashboard },
    { to: "/tasks", label: "Твои задачи", icon: CheckSquare },
    { to: "/stairs", label: "Лестница успеха", icon: Trophy },
    { to: "/analytics", label: "Аналитика", icon: BarChart3 },
    { to: "/settings", label: "Настройки", icon: Settings },
  ];
  const name = useName();

  const handleLogout = () => {
    localStorage.removeItem("auth-storage");
    window.location.pathname = "/";
  };

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/dashboard"
        className="mb-12 px-2 select-none flex items-center gap-3 cursor-pointer"
      >
        {isDarkMode ? (
          <img
            src="/Glowy.png"
            alt="Логотип Glowy"
            className="w-10 h-10 object-contain"
          />
        ) : (
          <img
            src="/Glowy-dark.png"
            alt="Логотип Glowy"
            className="w-10 h-10 object-contain"
          />
        )}

        <h2 className="font-display text-2xl font-black tracking-tighter text-indigo-500 italic">
          GLOWY<span className="text-slate-900 dark:text-slate-200">.AI</span>
        </h2>
      </Link>
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all font-medium ${
              location.pathname === item.to
                ? "text-indigo-400 bg-indigo-500/10"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <item.icon size={20} strokeWidth={2.5} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 mt-auto">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/70 px-5 py-1 dark:border-slate-700/50 dark:bg-slate-800/60">
          <User size={14} className="text-slate-400" />
          <span className="text-s max-w-20 truncate font-medium text-slate-700 dark:text-slate-200">
            {name}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-500 active:text-red-500 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-red-400"
          title="Выйти"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation();

  return (
    // <>
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <SidebarContent location={location} />
    </aside>
  );
};

export default Sidebar;
