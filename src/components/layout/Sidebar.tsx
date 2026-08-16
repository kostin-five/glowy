import { Link, useLocation, type Location } from "react-router-dom";
import {
  BarChart3,
  CheckSquare,
  LogOut,
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Trophy,
} from "lucide-react";
import { useAvatarId, useName } from "../../store/useAuthStore";
import {
  useIsDarkMode,
  useIsSidebarCollapsed,
  useToggleSidebarCollapsed,
} from "../../store/useSettingsStore";
import { useLogout } from "../../hooks/useLogout";
import { ProfileAvatar } from "../profile/AvatarPicker";

const SidebarContent = ({
  location,
  isCollapsed,
}: {
  location: Location;
  isCollapsed: boolean;
}) => {
  const isDarkMode = useIsDarkMode();
  const handleLogout = useLogout();
  const menuItems = [
    { to: "/dashboard", label: "Пункт управления", icon: LayoutDashboard },
    { to: "/tasks", label: "Твои задачи", icon: CheckSquare },
    { to: "/ai", label: "Чат", icon: MessageCircle },
    { to: "/stairs", label: "Мой прогресс", icon: Trophy },
    { to: "/analytics", label: "Аналитика", icon: BarChart3 },
    { to: "/settings", label: "Настройки", icon: Settings },
  ];
  const name = useName();
  const avatarId = useAvatarId();

  return (
    <div className="flex h-full flex-col">
      <Link
        to="/dashboard"
        className={`mb-12 flex cursor-pointer select-none items-center gap-3 px-2 ${isCollapsed ? "justify-center" : ""}`}
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

        {!isCollapsed && (
          <h2 className="font-display text-2xl font-black tracking-tighter text-indigo-500 italic">
            GLOWY<span className="text-slate-900 dark:text-slate-200">.AI</span>
          </h2>
        )}
      </Link>
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            title={isCollapsed ? item.label : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 font-medium transition-all ${isCollapsed ? "justify-center" : ""} ${
              location.pathname === item.to
                ? "text-indigo-400 bg-indigo-500/10"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <item.icon size={20} strokeWidth={2.5} />
            {!isCollapsed && item.label}
          </Link>
        ))}
      </nav>
      <div className={`mt-auto flex items-center gap-3 ${isCollapsed ? "flex-col" : ""}`}>
        <div className={`flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/70 py-1 dark:border-slate-700/50 dark:bg-slate-800/60 ${isCollapsed ? "px-2" : "px-5"}`}>
          <ProfileAvatar avatarId={avatarId} size="sm" />
          {!isCollapsed && (
            <span className="text-s max-w-20 truncate font-medium text-slate-700 dark:text-slate-200">
              {name}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-300"
          aria-label="Выйти из аккаунта"
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
  const isCollapsed = useIsSidebarCollapsed();
  const toggleSidebarCollapsed = useToggleSidebarCollapsed();

  return (
    <aside
      className={`sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white p-6 transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 lg:flex ${isCollapsed ? "w-20" : "w-64"}`}
    >
      <button
        type="button"
        onClick={toggleSidebarCollapsed}
        className="absolute -right-4 top-24 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
        aria-label={isCollapsed ? "Показать навигацию" : "Скрыть навигацию"}
        title={isCollapsed ? "Показать навигацию" : "Скрыть навигацию"}
      >
        {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
      </button>
      <SidebarContent location={location} isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
