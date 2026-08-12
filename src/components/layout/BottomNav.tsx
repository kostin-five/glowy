import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckSquare, Ellipsis, LayoutDashboard, Trophy } from "lucide-react";
import GlowyAiOrb from "./GlowyAiOrb";
import MobileAiSheet from "./MobileAiSheet";
import MobileMoreSheet from "./MobileMoreSheet";

type MobilePanel = "ai" | "more" | null;
type OpenMobilePanel = {
  name: Exclude<MobilePanel, null>;
  pathname: string;
};

const BottomNav = () => {
  const location = useLocation();
  const [openPanel, setOpenPanel] = useState<OpenMobilePanel | null>(null);
  const activePanel =
    openPanel?.pathname === location.pathname ? openPanel.name : null;

  useEffect(() => {
    const openAiSheet = () =>
      setOpenPanel({ name: "ai", pathname: location.pathname });

    window.addEventListener("glowy:open-mobile-ai", openAiSheet);
    return () => window.removeEventListener("glowy:open-mobile-ai", openAiSheet);
  }, [location.pathname]);

  const navItems = [
    { to: "/dashboard", label: "Главная", icon: LayoutDashboard },
    { to: "/tasks", label: "Задачи", icon: CheckSquare },
  ];
  const progressItem = { to: "/stairs", label: "Мой прогресс", icon: Trophy };
  const isAiActive = activePanel === "ai" || location.pathname === "/ai";
  const isMoreActive =
    activePanel === "more" ||
    location.pathname === "/analytics" ||
    location.pathname === "/settings";

  const renderLink = ({
    to,
    label,
    icon: Icon,
  }: (typeof navItems)[number]) => {
    const isActive = location.pathname === to;

    return (
      <Link
        key={to}
        to={to}
        aria-current={isActive ? "page" : undefined}
        className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 px-1 text-center transition-colors ${
          isActive
            ? "text-indigo-500 dark:text-indigo-300"
            : "text-slate-600 active:text-slate-950 dark:text-slate-400 dark:active:text-slate-100"
        }`}
      >
        <Icon size={20} strokeWidth={isActive ? 2.6 : 2} />
        <span className="max-w-full truncate text-[9px] font-semibold leading-3 tracking-tight">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Основная мобильная навигация"
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/20 lg:hidden"
      >
        {navItems.map(renderLink)}

        <div className="relative h-full min-w-0">
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
            <GlowyAiOrb
              isActive={isAiActive}
              onClick={() =>
                setOpenPanel(
                  activePanel === "ai"
                    ? null
                    : { name: "ai", pathname: location.pathname }
                )
              }
            />
          </div>
          <span
            className={`absolute inset-x-0 bottom-1 text-center text-[9px] font-extrabold leading-3 ${
              isAiActive
                ? "text-cyan-600 dark:text-cyan-300"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            Glowy AI
          </span>
        </div>

        {renderLink(progressItem)}

        <button
          type="button"
          onClick={() =>
            setOpenPanel(
              activePanel === "more"
                ? null
                : { name: "more", pathname: location.pathname }
            )
          }
          aria-label="Открыть меню «Ещё»"
          aria-pressed={isMoreActive}
          className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors ${
            isMoreActive
              ? "text-indigo-500 dark:text-indigo-300"
              : "text-slate-600 active:text-slate-950 dark:text-slate-400 dark:active:text-slate-100"
          }`}
        >
          <Ellipsis size={21} strokeWidth={isMoreActive ? 2.6 : 2} />
          <span className="text-[9px] font-semibold leading-3">Ещё</span>
        </button>
      </nav>

      <MobileAiSheet
        isOpen={activePanel === "ai"}
        onClose={() => setOpenPanel(null)}
      />
      <MobileMoreSheet
        isOpen={activePanel === "more"}
        onClose={() => setOpenPanel(null)}
      />
    </>
  );
};

export default BottomNav;
