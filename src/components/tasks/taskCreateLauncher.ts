export const TASK_CREATE_LAUNCHER_EVENT = "glowy:open-task-create";

export const openTaskCreateLauncher = () => {
  window.dispatchEvent(new Event(TASK_CREATE_LAUNCHER_EVENT));
};
