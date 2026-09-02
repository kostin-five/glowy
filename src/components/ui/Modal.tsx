import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react/jsx-runtime";
import { X } from "lucide-react";

interface ICreateModal {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: "md" | "2xl";
}

const Modal = ({ isOpen, onClose, title, children, maxWidth = "md" }: ICreateModal) => {
  const stopDragPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        onClose={onClose}
        className="fixed inset-0 z-50"
        onPointerDown={stopDragPropagation}
        onMouseDown={stopDragPropagation}
        onTouchStart={stopDragPropagation}
        data-no-dnd="true"
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex min-h-full items-end justify-center pt-4 text-center sm:items-center sm:p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
              enterTo="translate-y-0 opacity-100 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="translate-y-0 opacity-100 sm:scale-100"
              leaveTo="translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                data-testid="modal-panel"
                className={
                  `flex max-h-[calc(100dvh-1rem)] w-full ${maxWidth === "2xl" ? "max-w-2xl" : "max-w-md"} transform flex-col rounded-t-3xl border border-b-0 border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-left align-middle shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900 sm:max-h-[90vh] sm:rounded-2xl sm:border-b sm:p-6`
                }
              >
                <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" aria-hidden="true" />
                <div className="mb-4 flex shrink-0 items-start justify-between gap-4 sm:mb-6">
                  <DialogTitle className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
                    {title}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="-mr-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 sm:-mr-2 sm:pr-2">
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
