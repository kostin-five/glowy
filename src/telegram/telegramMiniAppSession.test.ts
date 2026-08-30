// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  allowTelegramMiniAppAutoRestore,
  blockTelegramMiniAppAutoRestore,
  isTelegramMiniAppAutoRestoreBlocked,
} from "./telegramMiniAppSession";

describe("Telegram Mini App restore preference", () => {
  beforeEach(() => localStorage.clear());

  it("blocks automatic restore without storing account or Telegram data", () => {
    blockTelegramMiniAppAutoRestore();

    expect(isTelegramMiniAppAutoRestoreBlocked()).toBe(true);
    expect(JSON.stringify(localStorage)).not.toMatch(/user|email|token|telegramUser|initData/i);
  });

  it("allows automatic restore after a successful manual sign-in", () => {
    blockTelegramMiniAppAutoRestore();
    allowTelegramMiniAppAutoRestore();

    expect(isTelegramMiniAppAutoRestoreBlocked()).toBe(false);
  });
});
