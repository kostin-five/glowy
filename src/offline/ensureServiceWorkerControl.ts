const SW_CONTROLLER_RELOAD_MARKER = "glowy-sw-controller-reload";

export const ensureServiceWorkerControl = async () => {
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  if (hadController) {
    sessionStorage.removeItem(SW_CONTROLLER_RELOAD_MARKER);
  }

  const reloadWithCurrentWorker = () => {
    if (sessionStorage.getItem(SW_CONTROLLER_RELOAD_MARKER) === "done") return;
    sessionStorage.setItem(SW_CONTROLLER_RELOAD_MARKER, "done");
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener(
    "controllerchange",
    reloadWithCurrentWorker,
    { once: true }
  );

  try {
    const registration = await navigator.serviceWorker.ready;

    if (!hadController && navigator.serviceWorker.controller) {
      reloadWithCurrentWorker();
      return;
    }

    if (navigator.onLine) await registration.update();
  } catch {
    // The application remains usable online when service workers are unavailable.
  }
};
