// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  openTaskCreateLauncher,
  TASK_CREATE_LAUNCHER_EVENT,
} from "./taskCreateLauncher";

describe("taskCreateLauncher", () => {
  it("dispatches the shared open event without task data", () => {
    const listener = vi.fn();
    window.addEventListener(TASK_CREATE_LAUNCHER_EVENT, listener);

    openTaskCreateLauncher();

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(TASK_CREATE_LAUNCHER_EVENT, listener);
  });
});
