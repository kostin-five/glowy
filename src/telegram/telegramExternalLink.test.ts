// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { isAllowedTelegramExternalUrl, openTelegramExternalLink } from "./telegramExternalLink";

describe("Telegram external links", () => {
  it("allows only Glowy and payment-provider HTTPS destinations", () => {
    expect(isAllowedTelegramExternalUrl("https://glowy-ai.ru/privacy")).toBe(true);
    expect(isAllowedTelegramExternalUrl("https://pay.yookassa.ru/checkout")).toBe(true);
    expect(isAllowedTelegramExternalUrl("http://glowy-ai.ru")).toBe(false);
    expect(isAllowedTelegramExternalUrl("https://evil.example")).toBe(false);
  });

  it("uses Telegram openLink for an allowed URL", () => {
    const openLink = vi.fn();
    expect(openTelegramExternalLink("https://pay.yookassa.ru/checkout", {
      initData: "signed",
      ready: vi.fn(),
      expand: vi.fn(),
      openLink,
    })).toBe(true);
    expect(openLink).toHaveBeenCalledWith("https://pay.yookassa.ru/checkout");
  });

  it("uses ordinary browser navigation when the Telegram bridge is absent", () => {
    const navigate = vi.fn();
    expect(openTelegramExternalLink("https://glowy-ai.ru/privacy", null, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledWith("https://glowy-ai.ru/privacy");
  });
});
