// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  trackProductEvent,
  trackProductEventOnce,
} from "./analytics";

const metrika = vi.fn();

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  metrika.mockClear();
  delete window.ym;
  delete window.__YANDEX_METRIKA_INITIALIZED__;
});

describe("product analytics", () => {
  it("does not send product events without analytics consent", () => {
    window.ym = metrika;
    window.__YANDEX_METRIKA_INITIALIZED__ = true;

    expect(trackProductEvent("signup_started")).toBe(false);
    expect(metrika).not.toHaveBeenCalled();
  });

  it("sends only approved UTM values after consent", () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
    window.ym = metrika;
    window.__YANDEX_METRIKA_INITIALIZED__ = true;

    expect(
      trackProductEvent("signup_completed", {
        utm_source: "telegram",
        utm_campaign: "august",
        taskTitle: "Не передавать",
        prompt: "И это тоже",
      })
    ).toBe(true);

    expect(metrika).toHaveBeenCalledWith(
      expect.any(Number),
      "reachGoal",
      "signup_completed",
      {
        utm_source: "telegram",
        utm_campaign: "august",
      }
    );
  });

  it("records a milestone once per browser session", () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
    window.ym = metrika;
    window.__YANDEX_METRIKA_INITIALIZED__ = true;

    expect(trackProductEventOnce("first_task_created")).toBe(true);
    expect(trackProductEventOnce("first_task_created")).toBe(false);
    expect(metrika).toHaveBeenCalledTimes(1);
  });
});
