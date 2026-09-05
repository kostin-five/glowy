// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "../store/useSettingsStore";
import { useAppWallpaper } from "./useAppWallpaper";

const storage = vi.hoisted(() => ({
  get: vi.fn(),
}));
const objectUrls = vi.hoisted(() => ({
  create: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("./customWallpaperStorage", () => ({
  getCustomWallpaper: storage.get,
}));

beforeEach(() => {
  useSettingsStore.setState({
    appWallpaperId: "custom",
    appWallpaperRevision: 1,
  });
  storage.get.mockResolvedValue(new Blob(["wallpaper"], { type: "image/webp" }));
  objectUrls.create
    .mockReturnValueOnce("blob:first")
    .mockReturnValueOnce("blob:second");
  vi.stubGlobal("URL", {
    createObjectURL: objectUrls.create,
    revokeObjectURL: objectUrls.revoke,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("useAppWallpaper", () => {
  it("ignores a previous custom URL after the wallpaper revision changes", async () => {
    const { result } = renderHook(() => useAppWallpaper());

    await waitFor(() =>
      expect(result.current).toEqual({
        backgroundImage: 'url("blob:first")',
        isCustom: true,
      })
    );

    act(() => useSettingsStore.getState().setAppWallpaperId("midnight"));
    expect(result.current.isCustom).toBe(false);

    act(() => useSettingsStore.getState().setAppWallpaperId("custom"));
    expect(result.current.isCustom).toBe(false);
    await waitFor(() =>
      expect(result.current).toEqual({
        backgroundImage: 'url("blob:second")',
        isCustom: true,
      })
    );

    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:first");
    expect(storage.get).toHaveBeenCalledTimes(2);
  });
});
