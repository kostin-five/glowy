const DEV_SW_READY_RELOAD_MARKER = "glowy-dev-sw-ready-reload";

export const ensureDevServiceWorkerControl = async () => {
  if (!import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  if (navigator.serviceWorker.controller) return;
  if (sessionStorage.getItem(DEV_SW_READY_RELOAD_MARKER) === "done") return;

  try {
    await navigator.serviceWorker.ready;
    sessionStorage.setItem(DEV_SW_READY_RELOAD_MARKER, "done");
    window.location.reload();
  } catch {
    // Local development must remain usable if service workers are unavailable.
  }
};
