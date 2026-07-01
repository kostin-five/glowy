import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment } from "react/jsx-runtime";

interface ICreateModal {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ICreateModal) => {
  const stopDragPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        onClose={onClose}
        className="relative z-50"
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
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className={
                  "w-full max-w-md transform flex flex-col max-h-[90vh] rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900"
                }
              >
                <h2 className="mb-6 shrink-0 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
                <div className="overflow-y-auto flex-1 pr-2 -mr-2">
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
