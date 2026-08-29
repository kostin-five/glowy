import { describe, expect, it } from "vitest";
import { getTelegramMiniAppRoute } from "./telegramMiniAppRoutes";

describe("Telegram Mini App routes", () => {
  it("maps only declared targets", () => {
    expect(getTelegramMiniAppRoute("tasks")).toBe("/tasks");
    expect(getTelegramMiniAppRoute("progress")).toBe("/progress");
    expect(getTelegramMiniAppRoute("https://example.com")).toBe("/dashboard");
    expect(getTelegramMiniAppRoute("//example.com")).toBe("/dashboard");
  });
});
