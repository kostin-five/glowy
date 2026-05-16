import { Link, useLocation, type Location } from "react-router-dom";
import { Dialog, DialogPanel } from "@headlessui/react";
import { BarChart3, CheckSquare, LayoutDashboard } from "lucide-react";
import { useUserName } from "../../store/useAuthStore";

interface ISidebar {
  isMenuOpen: boolean;
  closeMenu: () => void;
}

const SidebarContent = ({
  location,
  closeMenu,
}: {
  location: Location;
  closeMenu: () => void;
}) => {
  const menuItems = [
    { to: "/dashboard", label: "Пункт управления", icon: LayoutDashboard },
    { to: "/tasks", label: "Твои задачи", icon: CheckSquare },
    { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  ];
  const username = useUserName();

  return (
    <div className="flex flex-col h-full">
      <div className="mb-12 px-2 select-none flex items-center gap-3">
        <img
          src="/Glowy.png"
          alt="Логотип Glowy"
          className="w-10 h-10 object-contain"
        />
        <h2 className="text-2xl font-black tracking-tighter text-indigo-500 italic">
          GLOWY<span className="text-slate-200">.AI</span>
        </h2>
      </div>
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => closeMenu()}
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
      <div className="mt-auto flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl">
        {/* <img
          src=""
          alt="аватар"
          className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 shrink-0"
        /> */}
        <p className="text-sm font-medium text-slate-200">{username}</p>
      </div>{" "}
    </div>
  );
};

const Sidebar = ({ isMenuOpen, closeMenu }: ISidebar) => {
  const location = useLocation();

  return (
    <>
      <aside className="sticky top-0 w-64 flex-col h-screen border-r border-slate-800 bg-slate-900 p-6 hidden lg:flex">
        <SidebarContent closeMenu={closeMenu} location={location} />
      </aside>

      <Dialog
        open={isMenuOpen}
        onClose={closeMenu}
        className="relative z-50 lg:hidden"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

        <div className="fixed inset-0 flex">
          <DialogPanel className="w-full max-w-xs bg-slate-900 shadow-2xl z-50 p-6 flex flex-col">
            <SidebarContent closeMenu={closeMenu} location={location} />
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
};

export default Sidebar;
