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

  it("records draft confirmation without private text fields", () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
    window.ym = metrika;
    window.__YANDEX_METRIKA_INITIALIZED__ = true;

    expect(
      trackProductEvent("ai_draft_confirmed", {
        title: "Личный текст задачи",
        prompt: "Личное сообщение",
      })
    ).toBe(true);

    expect(metrika).toHaveBeenCalledWith(
      expect.any(Number),
      "reachGoal",
      "ai_draft_confirmed",
      {}
    );
  });

  it.each(["habit_created", "rescue_used", "task_time_recorded"] as const)(
    "records %s without user-authored text",
    (event) => {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
      window.ym = metrika;
      window.__YANDEX_METRIKA_INITIALIZED__ = true;

      expect(
        trackProductEvent(event, {
          title: "Личное название",
          habitTitle: "Личная привычка",
          taskTitle: "Личная задача",
        })
      ).toBe(true);

      expect(metrika).toHaveBeenLastCalledWith(
        expect.any(Number),
        "reachGoal",
        event,
        {}
      );
    }
  );

  it.each(["day_plan_opened", "day_plan_applied"] as const)(
    "records %s without task metadata",
    (event) => {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
      window.ym = metrika;
      window.__YANDEX_METRIKA_INITIALIZED__ = true;

      expect(trackProductEvent(event, {
        taskId: "42",
        taskTitle: "Личная задача",
        date: "2026-09-04",
      })).toBe(true);
      expect(metrika).toHaveBeenLastCalledWith(
        expect.any(Number),
        "reachGoal",
        event,
        {}
      );
    }
  );
});
