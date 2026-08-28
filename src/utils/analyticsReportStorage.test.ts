// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteAnalyticsReport,
  readAnalyticsReport,
  saveAnalyticsReport,
} from "./analyticsReportStorage";

const identity = {
  ownerId: 42,
  period: "week" as const,
  from: "2026-08-24",
  to: "2026-08-30",
};

beforeEach(() => localStorage.clear());

describe("analytics report storage", () => {
  it("round-trips only the exact owner and period", () => {
    saveAnalyticsReport(identity, "  **Итог**  ", localStorage, new Date("2026-08-28T10:00:00Z"));
    expect(readAnalyticsReport(identity)?.text).toBe("**Итог**");
    expect(readAnalyticsReport({ ...identity, ownerId: 43 })).toBeNull();
    expect(readAnalyticsReport({ ...identity, period: "month" })).toBeNull();
  });

  it("ignores malformed records and deletes explicitly", () => {
    localStorage.setItem("glowy-analytics-report-v1:42:week:2026-08-24:2026-08-30", "not json");
    expect(readAnalyticsReport(identity)).toBeNull();
    saveAnalyticsReport(identity, "Отчёт");
    deleteAnalyticsReport(identity);
    expect(readAnalyticsReport(identity)).toBeNull();
  });

  it("does not break the report screen when browser storage is unavailable", () => {
    const unavailableStorage = {
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(saveAnalyticsReport(identity, "Отчёт", unavailableStorage)).toBeNull();
    expect(() => deleteAnalyticsReport(identity, unavailableStorage)).not.toThrow();
  });
});
