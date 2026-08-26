import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { BarChart3, ChevronRight, NotebookPen, Settings, X } from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import { Link } from "react-router-dom";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMoreSheet = ({ isOpen, onClose }: MobileMoreSheetProps) => {
  const links = [
    { to: "/notes", label: "Заметки", icon: NotebookPen },
    { to: "/analytics", label: "Аналитика", icon: BarChart3 },
    { to: "/settings", label: "Настройки", icon: Settings },
  ];

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50 lg:hidden">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end">
          <TransitionChild
            as={Fragment}
            enter="transform ease-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="transform ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <DialogPanel className="w-full rounded-t-[2rem] border border-b-0 border-slate-200 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="mb-3 flex items-center justify-between">
                <DialogTitle className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Ещё
                </DialogTitle>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть меню «Ещё»"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {links.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={onClose}
                    className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                  >
                    <Icon size={20} className="text-indigo-500 dark:text-indigo-300" />
                    <span>{label}</span>
                    <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </Link>
                ))}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MobileMoreSheet;
