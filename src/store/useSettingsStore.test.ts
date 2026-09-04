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

describe("useSettingsStore task form preferences", () => {
  it("uses compatible defaults and isolates accounts", async () => {
    const {
      DEFAULT_TASK_FORM_PREFERENCES,
      getTaskFormPreferenceScope,
      useSettingsStore,
    } = await loadStore();
    const firstAccount = getTaskFormPreferenceScope(10, false);
    const secondAccount = getTaskFormPreferenceScope(20, false);

    expect(
      useSettingsStore.getState().taskFormPreferencesByAccount[firstAccount] ??
        DEFAULT_TASK_FORM_PREFERENCES
    ).toEqual({
      mode: "medium",
      fields: { energy: true, priority: true },
    });

    useSettingsStore.getState().setTaskFormMode(firstAccount, "compact");
    useSettingsStore
      .getState()
      .setTaskFormFieldVisible(firstAccount, "energy", false);

    expect(
      useSettingsStore.getState().taskFormPreferencesByAccount[firstAccount]
    ).toEqual({
      mode: "compact",
      fields: { energy: false, priority: true },
    });
    expect(
      useSettingsStore.getState().taskFormPreferencesByAccount[secondAccount]
    ).toBeUndefined();
  });

  it("normalizes each damaged persisted preference independently", async () => {
    localStorage.setItem(
      "glowy-settings",
      JSON.stringify({
        state: {
          taskFormPreferencesByAccount: {
            "user:10": {
              mode: "unknown",
              fields: { energy: false, priority: "yes" },
            },
          },
        },
        version: 0,
      })
    );

    const { useSettingsStore } = await loadStore();

    expect(
      useSettingsStore.getState().taskFormPreferencesByAccount["user:10"]
    ).toEqual({
      mode: "medium",
      fields: { energy: false, priority: true },
    });
  });
});

describe("useSettingsStore wallpaper preferences", () => {
  it("uses the darker default and accepts a supported preset", async () => {
    const { useSettingsStore } = await loadStore();

    expect(useSettingsStore.getState().appWallpaperId).toBe("midnight");
    useSettingsStore.getState().setAppWallpaperId("nebula");

    expect(useSettingsStore.getState()).toMatchObject({
      appWallpaperId: "nebula",
      appWallpaperRevision: 1,
    });
  });

  it("replaces an unknown persisted wallpaper with the safe default", async () => {
    localStorage.setItem(
      "glowy-settings",
      JSON.stringify({
        state: { appWallpaperId: "unknown-wallpaper" },
        version: 0,
      })
    );

    const { useSettingsStore } = await loadStore();

    expect(useSettingsStore.getState().appWallpaperId).toBe("midnight");
  });
});
