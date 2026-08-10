// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  meRequest: vi.fn(),
}));

vi.mock("../api/AuthApi", () => ({
  AuthApi: { meRequest: mocks.meRequest },
}));

const { useAuthStore } = await import("./useAuthStore");

afterEach(() => {
  mocks.meRequest.mockReset();
  useAuthStore.getState().toLogout();
});

describe("authentication session checks", () => {
  it("does not let a stale failed session check log out a newly signed-in user", async () => {
    let rejectSessionCheck: (reason?: unknown) => void = () => undefined;
    mocks.meRequest.mockReturnValue(
      new Promise((_, reject) => {
        rejectSessionCheck = reject;
      })
    );

    const pendingCheck = useAuthStore.getState().checkAuth();
    useAuthStore.getState().toLogin("Тест", "test@example.com");
    rejectSessionCheck(new Error("Unauthorized"));
    await pendingCheck;

    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      isGuest: false,
      isChecking: false,
      name: "Тест",
      email: "test@example.com",
    });
  });
});
