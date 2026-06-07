import { type ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import BottomNav from "../components/layout/BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="relative flex h-dvh min-h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/10 blur-[120px]"></div>
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-8 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
