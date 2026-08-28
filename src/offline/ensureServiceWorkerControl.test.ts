import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureServiceWorkerControl } from "./ensureServiceWorkerControl";

describe("ensureServiceWorkerControl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not reload or subscribe to controller changes on first install", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const addEventListener = vi.fn();

    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: {
        controller: null,
        ready: Promise.resolve({ update }),
        addEventListener,
      },
    });

    await ensureServiceWorkerControl();

    expect(update).toHaveBeenCalledOnce();
    expect(addEventListener).not.toHaveBeenCalled();
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

    await ensureServiceWorkerControl();
    listeners.get("controllerchange")?.();
    listeners.get("controllerchange")?.();

    expect(update).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });
});
