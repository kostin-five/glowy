import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { ArrowUpRight, X } from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import MindHubChat from "../mind/MindHubChat";

interface MobileAiSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileAiSheet = ({ isOpen, onClose }: MobileAiSheetProps) => {
  const navigate = useNavigate();

  const openFullChat = () => {
    onClose();
    navigate("/ai");
  };

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
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
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
            <DialogPanel className="max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] border border-b-0 border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-2 dark:border-slate-800">
                <DialogTitle className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Быстрая разгрузка
                </DialogTitle>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={openFullChat}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    Полный чат
                    <ArrowUpRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть быструю разгрузку"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <X size={19} />
                  </button>
                </div>
              </div>
              <MindHubChat variant="quick" />
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MobileAiSheet;
