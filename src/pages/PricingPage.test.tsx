// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentApi } from "../api/PaymentApi";
import PricingPage from "./PricingPage";

vi.mock("../store/useAuthStore", () => ({
  useIsAuthenticated: () => true,
  useIsGuest: () => false,
}));

vi.mock("../hooks/useNetworkStatus", () => ({ default: () => true }));
vi.mock("../telegram/telegramMiniAppContext", () => ({
  useTelegramMiniApp: () => ({ isTelegramMiniApp: false, webApp: null }),
}));
vi.mock("../api/PaymentApi", () => ({
  PaymentApi: {
    getCurrentPlan: vi.fn(),
    createFocusPayment: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(PaymentApi.getCurrentPlan).mockResolvedValue({
    plan: "forever",
    subscriptionStatus: "active",
    planExpiresAt: null,
  });
});

describe("PricingPage", () => {
  it("presents an existing Forever account without public activation", async () => {
    render(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { level: 3, name: "Forever" })).toBeTruthy();
    expect(screen.getByText("Активен бессрочно")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Скоро" })).toHaveProperty("disabled", true);
    expect(Object.keys(PaymentApi).sort()).toEqual(["createFocusPayment", "getCurrentPlan"].sort());
  });
});
