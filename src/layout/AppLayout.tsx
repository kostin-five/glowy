import { Suspense, type ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import BottomNav from "../components/layout/BottomNav";
import Spinner from "../components/ui/Spinner";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="relative flex h-dvh min-h-dvh overflow-hidden bg-slate-950 text-slate-200">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-8 lg:pb-6">
          <Suspense fallback={<Spinner />}>{children}</Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
