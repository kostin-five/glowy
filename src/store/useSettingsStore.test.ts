// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const loadStore = async () => {
  vi.resetModules();
  return import("./useSettingsStore");
};

beforeEach(() => {
  localStorage.clear();
});

describe("useSettingsStore onboarding hints", () => {
  it("dismisses every hint at most once", async () => {
    const { useSettingsStore } = await loadStore();

    useSettingsStore.getState().markOnboardingHintShown("taskCreation");
    useSettingsStore.getState().markOnboardingHintShown("taskCreation");

    expect(useSettingsStore.getState().shownOnboardingHints).toEqual([
      "taskCreation",
    ]);
  });

  it("restores all onboarding hints without changing other settings", async () => {
    const { useSettingsStore } = await loadStore();

    useSettingsStore.getState().setStartRoute("/tasks");
    useSettingsStore.getState().markOnboardingHintShown("taskCreation");
    useSettingsStore.getState().resetOnboardingHints();

    expect(useSettingsStore.getState()).toMatchObject({
      startRoute: "/tasks",
      shownOnboardingHints: [],
    });
  });

  it("keeps onboarding hints visible for legacy persisted settings", async () => {
    localStorage.setItem(
      "glowy-settings",
      JSON.stringify({ state: { isDarkMode: false }, version: 0 })
    );

    const { useSettingsStore } = await loadStore();

    expect(useSettingsStore.getState()).toMatchObject({
      themeMode: "light",
      shownOnboardingHints: [],
    });
  });
});
