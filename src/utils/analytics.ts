// Compatibility for existing product call sites, including the unchanged landing.
// Portfolio builds do not load analytics, transmit events or persist tracking IDs.
export type AnalyticsEventName =
  | "landing_cta_click" | "signup_started" | "signup_completed"
  | "first_task_created" | "first_ai_request" | "ai_draft_confirmed"
  | "focus_checkout_started" | "habit_created" | "rescue_used"
  | "task_time_recorded" | "day_plan_opened" | "day_plan_applied";

export const trackProductEvent = (
  _event: AnalyticsEventName, _parameters?: Record<string, unknown>
): false => {
  void _event;
  void _parameters;
  return false;
};

export const trackProductEventOnce = trackProductEvent;
