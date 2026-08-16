// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "../../store/useSettingsStore";
import FirstUsePopover from "./FirstUsePopover";

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ shownOnboardingHints: [] });
});

afterEach(() => {
  cleanup();
});

describe("FirstUsePopover", () => {
  it("shows once and records the first display", () => {
    const { unmount } = render(
      <FirstUsePopover id="taskCreation">Первая подсказка</FirstUsePopover>
    );

    expect(screen.getByText("Первая подсказка")).toBeTruthy();
    expect(useSettingsStore.getState().shownOnboardingHints).toEqual([
      "taskCreation",
    ]);

    unmount();
    render(
      <FirstUsePopover id="taskCreation">Первая подсказка</FirstUsePopover>
    );

    expect(screen.queryByText("Первая подсказка")).toBeNull();
  });

  it("can be closed immediately", () => {
    render(
      <FirstUsePopover id="taskCreation">Первая подсказка</FirstUsePopover>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Закрыть подсказку" })
    );

    expect(screen.queryByText("Первая подсказка")).toBeNull();
  });
});
