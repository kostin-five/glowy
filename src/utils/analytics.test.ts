// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { trackProductEvent, trackProductEventOnce } from "./analytics";

it("never sends analytics or writes tracking state, even with old consent", () => {
  localStorage.setItem("glowy_cookie_consent", "accepted");
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const storageSpy = vi.spyOn(Storage.prototype, "setItem");
  try {
    expect(trackProductEvent("signup_started", { prompt: "private fixture" })).toBe(false);
    expect(trackProductEventOnce("first_task_created")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(document.querySelector('script[src*="mc.yandex"]')).toBeNull();
  } finally {
    vi.restoreAllMocks();
    localStorage.clear();
  }
});
