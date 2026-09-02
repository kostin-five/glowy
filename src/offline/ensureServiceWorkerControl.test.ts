import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureServiceWorkerControl } from "./ensureServiceWorkerControl";

describe("ensureServiceWorkerControl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not reload or subscribe to controller changes on first install", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const addEventListener = vi.fn();
    const removeItem = vi.fn();

    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: {
        controller: null,
        ready: Promise.resolve({ update }),
        addEventListener,
      },
    });
    vi.stubGlobal("sessionStorage", { removeItem });

    await ensureServiceWorkerControl({ isDevelopment: false });

    expect(update).toHaveBeenCalledOnce();
    expect(addEventListener).not.toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalledOnce();
  });

  it("reloads once when an existing controller is replaced", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const listeners = new Map<string, () => void>();
    const storage = new Map<string, string>();
    const reload = vi.fn();

    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: {
        controller: {},
        ready: Promise.resolve({ update }),
        addEventListener: vi.fn((event: string, listener: () => void) => {
          listeners.set(event, listener);
        }),
      },
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubGlobal("window", { location: { reload } });

    await ensureServiceWorkerControl({ isDevelopment: false });
    listeners.get("controllerchange")?.();
    listeners.get("controllerchange")?.();

    expect(update).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("removes an old service worker and reloads once in development", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const storage = new Map<string, string>();
    const reload = vi.fn();

    vi.stubGlobal("navigator", {
      serviceWorker: {
        controller: {},
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
      },
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubGlobal("window", { location: { reload } });

    await ensureServiceWorkerControl({ isDevelopment: true });
    await ensureServiceWorkerControl({ isDevelopment: true });

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledOnce();
  });
});
