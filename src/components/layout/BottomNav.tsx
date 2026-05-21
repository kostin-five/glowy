import { Link, useLocation } from "react-router-dom";
import { BarChart3, CheckSquare, LayoutDashboard } from "lucide-react";

const BottomNav = () => {
  const location = useLocation();

  const menuItems = [
    { to: "/dashboard", label: "Главная", icon: LayoutDashboard },
    { to: "/tasks", label: "Задачи", icon: CheckSquare },
    { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full h-16 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 lg:hidden">
      {menuItems.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
              isActive
                ? "text-indigo-400"
                : "text-slate-400 active:text-slate-200"
            }`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
