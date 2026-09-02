const SW_CONTROLLER_RELOAD_MARKER = "glowy-sw-controller-reload";
const DEV_SW_REMOVAL_RELOAD_MARKER = "glowy-dev-sw-removal-reload";

interface ServiceWorkerControlOptions {
  isDevelopment?: boolean;
}

export const ensureServiceWorkerControl = async ({
  isDevelopment = import.meta.env.DEV,
}: ServiceWorkerControlOptions = {}) => {
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);

  try {
    if (isDevelopment) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const removedRegistrations = await Promise.all(
        registrations.map((registration) => registration.unregister())
      );

      if (
        hadController &&
        removedRegistrations.some(Boolean) &&
        sessionStorage.getItem(DEV_SW_REMOVAL_RELOAD_MARKER) !== "done"
      ) {
        sessionStorage.setItem(DEV_SW_REMOVAL_RELOAD_MARKER, "done");
        window.location.reload();
      }
      return;
    }

    sessionStorage.removeItem(DEV_SW_REMOVAL_RELOAD_MARKER);
    const registration = await navigator.serviceWorker.ready;

    if (!hadController) {
      if (navigator.onLine) await registration.update();
      return;
    }

    sessionStorage.removeItem(SW_CONTROLLER_RELOAD_MARKER);

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

    if (navigator.onLine) await registration.update();
  } catch {
    // The application remains usable online when service workers are unavailable.
  }
};
