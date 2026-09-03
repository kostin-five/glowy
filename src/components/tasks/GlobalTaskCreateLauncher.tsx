import { useEffect, useState } from "react";
import CreateTaskModal from "./CreateTaskModal";
import { TASK_CREATE_LAUNCHER_EVENT } from "./taskCreateLauncher";

const GlobalTaskCreateLauncher = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(TASK_CREATE_LAUNCHER_EVENT, open);
    return () => window.removeEventListener(TASK_CREATE_LAUNCHER_EVENT, open);
  }, []);

  return isOpen ? (
    <CreateTaskModal isOpen onClose={() => setIsOpen(false)} />
  ) : null;
};

export default GlobalTaskCreateLauncher;
