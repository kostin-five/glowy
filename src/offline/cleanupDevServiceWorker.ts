const DEV_SW_RELOAD_MARKER = "glowy-dev-sw-cleanup-reload";

export const cleanupDevServiceWorker = async (): Promise<boolean> => {
  if (!import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const hadController = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => window.caches.delete(cacheName)),
      );
    }

    if (
      hadController &&
      navigator.onLine &&
      sessionStorage.getItem(DEV_SW_RELOAD_MARKER) !== "done"
    ) {
      sessionStorage.setItem(DEV_SW_RELOAD_MARKER, "done");
      window.location.reload();
      return true;
    }

    sessionStorage.removeItem(DEV_SW_RELOAD_MARKER);
  } catch {
    // A stale worker must not block local startup.
  }

  return false;
};
