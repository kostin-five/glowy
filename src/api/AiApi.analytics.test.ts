// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const trackProductEventOnce = vi.fn();
const axiosInstance = {
  post,
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock("axios", () => ({
  default: {
    create: () => axiosInstance,
    post,
    isAxiosError: () => false,
  },
}));

vi.mock("../utils/analytics", () => ({ trackProductEventOnce }));

const { useAuthStore } = await import("../store/useAuthStore");
const { default: AiApi } = await import("./AiApi");

afterEach(() => {
  post.mockReset();
  trackProductEventOnce.mockReset();
  useAuthStore.setState({
    isAuthenticated: false,
    isGuest: false,
    token: null,
    currentEnergy: 100,
  });
});

describe("AI activation analytics", () => {
  it("records the milestone after an authenticated AI response", async () => {
    useAuthStore.setState({ isAuthenticated: true, isGuest: false });
    post.mockResolvedValue({ data: { drafts: [], reply: "Готово" } });

    const result = await AiApi.parseMindHub("Помоги выбрать следующую задачу");

    expect(trackProductEventOnce).toHaveBeenCalledWith("first_ai_request");
    expect(result.drafts).toEqual([]);
  });

  it("sends only the current guest message and mode without recording a milestone", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isGuest: true,
      guestRequestsCount: 0,
      guestRequestsResetDate: null,
    });
    post.mockResolvedValue({ data: { drafts: [], reply: "Готово" } });
    const result = await AiApi.parseMindHub("Помоги выбрать следующую задачу", "chat", [
      { role: "user", text: "История остаётся в браузере" },
    ]);

    expect(post).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/ai\/mind-hub\/public$/), {
      message: "Помоги выбрать следующую задачу",
      hubMode: "chat",
    });
    expect(trackProductEventOnce).not.toHaveBeenCalled();
    expect(result.drafts).toEqual([]);
    expect(result.reply).toBe("Готово");
  });
});
