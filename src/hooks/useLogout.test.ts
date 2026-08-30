// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogout } from "./useLogout";

const mocks = vi.hoisted(() => ({
  logoutRequest: vi.fn(),
  clearLocalAuthSession: vi.fn(),
  blockAutoRestore: vi.fn(),
  navigate: vi.fn(),
  isTelegramMiniApp: false,
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("../api/AuthApi", () => ({
  AuthApi: { logoutRequest: mocks.logoutRequest },
}));
vi.mock("../api/authSession", () => ({
  clearLocalAuthSession: mocks.clearLocalAuthSession,
}));
vi.mock("../telegram/telegramMiniAppContext", () => ({
  useTelegramMiniApp: () => ({ isTelegramMiniApp: mocks.isTelegramMiniApp }),
}));
vi.mock("../telegram/telegramMiniAppSession", () => ({
  blockTelegramMiniAppAutoRestore: mocks.blockAutoRestore,
}));

describe("useLogout", () => {
  beforeEach(() => {
    mocks.logoutRequest.mockReset().mockResolvedValue({});
    mocks.clearLocalAuthSession.mockReset();
    mocks.blockAutoRestore.mockReset();
    mocks.navigate.mockReset();
    mocks.isTelegramMiniApp = false;
  });

  it("keeps ordinary web logout unchanged", async () => {
    const { result } = renderHook(() => useLogout());
    await act(() => result.current());

    expect(mocks.blockAutoRestore).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("blocks Telegram auto-restore without unlinking on explicit Mini App logout", async () => {
    mocks.isTelegramMiniApp = true;
    const { result } = renderHook(() => useLogout());
    await act(() => result.current());

    expect(mocks.logoutRequest).toHaveBeenCalledOnce();
    expect(mocks.blockAutoRestore).toHaveBeenCalledOnce();
    expect(mocks.clearLocalAuthSession).toHaveBeenCalledOnce();
  });
});
