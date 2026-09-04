// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomWallpaperError } from "../../personalization/customWallpaperStorage";
import { useSettingsStore } from "../../store/useSettingsStore";
import WallpaperPicker from "./WallpaperPicker";

const storage = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("../../personalization/customWallpaperStorage", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../personalization/customWallpaperStorage")>();
  return {
    ...original,
    getCustomWallpaper: storage.get,
    saveCustomWallpaper: storage.save,
    deleteCustomWallpaper: storage.remove,
  };
});

beforeEach(() => {
  useSettingsStore.setState({ appWallpaperId: "midnight", appWallpaperRevision: 0 });
  storage.get.mockResolvedValue(null);
  storage.save.mockResolvedValue(undefined);
  storage.remove.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WallpaperPicker", () => {
  it("applies a prepared background immediately", () => {
    const onSaved = vi.fn();
    render(<WallpaperPicker onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: /Спокойный космос/ }));

    expect(useSettingsStore.getState().appWallpaperId).toBe("nebula");
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("stores a supported custom file and selects it", async () => {
    render(<WallpaperPicker onSaved={vi.fn()} />);
    const file = new File(["wallpaper"], "calm.webp", { type: "image/webp" });

    fireEvent.change(screen.getByLabelText("Загрузить своё изображение"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(storage.save).toHaveBeenCalledWith(file));
    expect(useSettingsStore.getState().appWallpaperId).toBe("custom");
    expect(screen.getByRole("button", { name: /Удалить/ })).toBeVisible();
  });

  it("keeps the current background and explains a rejected upload", async () => {
    storage.save.mockRejectedValue(new CustomWallpaperError("Файл должен быть не больше 5 МБ."));
    render(<WallpaperPicker onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Загрузить своё изображение"), {
      target: { files: [new File(["x"], "large.webp", { type: "image/webp" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("5 МБ");
    expect(useSettingsStore.getState().appWallpaperId).toBe("midnight");
  });

  it("deletes the local file and returns to the darker default", async () => {
    storage.get.mockResolvedValue(new Blob(["wallpaper"], { type: "image/webp" }));
    useSettingsStore.setState({ appWallpaperId: "custom" });
    render(<WallpaperPicker onSaved={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /Удалить/ }));

    await waitFor(() => expect(storage.remove).toHaveBeenCalledOnce());
    expect(useSettingsStore.getState().appWallpaperId).toBe("midnight");
  });
});
