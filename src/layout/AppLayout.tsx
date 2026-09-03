import { type ReactNode } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import BottomNav from "../components/layout/BottomNav";
import OfflineSyncStatus from "../components/OfflineSyncStatus";
import { useTelegramMiniApp } from "../telegram/telegramMiniAppContext";
import GlobalTaskCreateLauncher from "../components/tasks/GlobalTaskCreateLauncher";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTelegramMiniApp, webApp } = useTelegramMiniApp();
  const isFullScreenAi = location.pathname === "/ai";

  useEffect(() => {
    if (!isTelegramMiniApp || !webApp?.BackButton) return;
    const goBack = () => navigate("/dashboard");
    if (location.pathname === "/dashboard") {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(goBack);
    }
    return () => webApp.BackButton?.offClick(goBack);
  }, [isTelegramMiniApp, location.pathname, navigate, webApp]);

  return (
    <div
      className="relative flex h-[var(--tg-viewport-height,100dvh)] min-h-[var(--tg-viewport-height,100dvh)] overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200"
      style={isTelegramMiniApp ? { paddingTop: "var(--tg-content-safe-area-inset-top, 0px)" } : undefined}
    >
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/10 blur-[120px]"></div>
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!isFullScreenAi && <Header />}
        <OfflineSyncStatus />
        <main
          className={
            isFullScreenAi
              ? "min-h-0 flex-1 overflow-hidden p-0 pb-[calc(4rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-area-inset-bottom,0px)))] lg:pb-0"
              : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-[calc(6.5rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-area-inset-bottom,0px)))] md:px-8 lg:pb-6"
          }
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <GlobalTaskCreateLauncher />
    </div>
  );
};

export default AppLayout;
