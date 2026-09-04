// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CustomWallpaperError,
  deleteCustomWallpaper,
  getCustomWallpaper,
  saveCustomWallpaper,
  validateCustomWallpaperFile,
} from "./customWallpaperStorage";

const installIndexedDb = () => {
  let storedValue: unknown;
  let storeCreated = false;

  const database = {
    objectStoreNames: { contains: () => storeCreated },
    createObjectStore: () => {
      storeCreated = true;
    },
    close: vi.fn(),
    transaction: () => {
      const transaction: {
        oncomplete: (() => void) | null;
        onabort: (() => void) | null;
        objectStore: () => object;
      } = {
        oncomplete: null,
        onabort: null,
        objectStore: () => store,
      };
      const finish = (request: { result?: unknown; onsuccess: (() => void) | null }) => {
        queueMicrotask(() => {
          request.onsuccess?.();
          transaction.oncomplete?.();
        });
      };
      const store = {
        get: () => {
          const request = { result: storedValue, onsuccess: null as (() => void) | null, onerror: null };
          finish(request);
          return request;
        },
        put: (value: unknown) => {
          storedValue = value;
          const request = { result: "custom", onsuccess: null as (() => void) | null, onerror: null };
          finish(request);
          return request;
        },
        delete: () => {
          storedValue = undefined;
          const request = { result: undefined, onsuccess: null as (() => void) | null, onerror: null };
          finish(request);
          return request;
        },
      };
      return transaction;
    },
  };

  const factory = {
    open: () => {
      const request = {
        result: database,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  };

  vi.stubGlobal("indexedDB", factory);
};

afterEach(() => vi.unstubAllGlobals());

describe("custom wallpaper storage", () => {
  it("rejects unsupported and oversized files before storage", () => {
    expect(() => validateCustomWallpaperFile(new File(["x"], "image.svg", { type: "image/svg+xml" }))).toThrow(CustomWallpaperError);
    expect(() => validateCustomWallpaperFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.webp", { type: "image/webp" }))).toThrow("5 МБ");
  });

  it("writes, reads and deletes the single local Blob", async () => {
    installIndexedDb();
    const file = new File(["wallpaper"], "calm.webp", { type: "image/webp" });

    await saveCustomWallpaper(file);
    const restored = await getCustomWallpaper();
    expect(restored).toBeInstanceOf(Blob);
    expect(restored?.size).toBe(file.size);

    await deleteCustomWallpaper();
    await expect(getCustomWallpaper()).resolves.toBeNull();
  });
});
