import { Link, useLocation, type Location } from "react-router-dom";
import {
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Trophy,
  User,
} from "lucide-react";
import { useName } from "../../store/useAuthStore";

const SidebarContent = ({ location }: { location: Location }) => {
  const menuItems = [
    { to: "/dashboard", label: "Пункт управления", icon: LayoutDashboard },
    { to: "/tasks", label: "Твои задачи", icon: CheckSquare },
    { to: "/success-stairs", label: "Лестница успеха", icon: Trophy },
    { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  ];
  const name = useName();

  const handleLogout = () => {
    localStorage.removeItem("auth-storage");
    window.location.pathname = "/";
  };

  return (
    <div className="flex flex-col h-full">
      <Link
        to="/dashboard"
        className="mb-12 px-2 select-none flex items-center gap-3 cursor-pointer"
      >
        <img
          src="/Glowy.png"
          alt="Логотип Glowy"
          className="w-10 h-10 object-contain"
        />
        <h2 className="font-display text-2xl font-black tracking-tighter text-indigo-500 italic">
          GLOWY<span className="text-slate-200">.AI</span>
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
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <item.icon size={20} strokeWidth={2.5} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 mt-auto">
        <div className="flex items-center gap-1.5 px-5 py-1 bg-slate-800/60 border border-slate-700/50 rounded-xl">
          <User size={14} className="text-slate-400" />
          <span className="text-s font-medium text-slate-200 truncate max-w-20">
            {name}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-400 active:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-slate-800/40"
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
    <aside className="sticky top-0 w-64 flex-col h-screen border-r border-slate-800 bg-slate-900 p-6 hidden lg:flex">
      <SidebarContent location={location} />
    </aside>
  );
};

export default Sidebar;
