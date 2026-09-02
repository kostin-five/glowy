// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiApi from "../api/AiApi";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import SettingsPage from "./SettingsPage";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    userId: 10,
    isGuest: false,
    name: "Тест",
    email: null,
  });
  useSettingsStore.setState({ taskFormPreferencesByAccount: {} });
  vi.spyOn(AiApi, "getAiUsage").mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SettingsPage task form", () => {
  it("saves the default mode and field visibility for the current account", () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Коротко" }));
    fireEvent.click(screen.getByRole("switch", { name: "Показывать энергию" }));

    expect(
      useSettingsStore.getState().taskFormPreferencesByAccount["user:10"]
    ).toEqual({
      mode: "compact",
      fields: { energy: false, priority: true },
    });
    expect(screen.getByText("Настройки сохранены")).toBeVisible();
  });
});
