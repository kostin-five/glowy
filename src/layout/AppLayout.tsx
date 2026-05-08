import type { ReactNode } from "react";
import Sidebar from "../components/layout/Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="grid grid-cols-[280px_1fr] min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="overflow-y-auto px-8 py-6">{children}</main>
    </div>
  );
};

export default AppLayout;
