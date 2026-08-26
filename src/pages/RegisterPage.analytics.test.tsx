// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "./RegisterPage";

const mocks = vi.hoisted(() => ({
  registerRequest: vi.fn(),
  toLogin: vi.fn(),
  trackProductEventOnce: vi.fn(),
}));

vi.mock("../api/AuthApi", () => ({
  AuthApi: { registerRequest: mocks.registerRequest },
}));

vi.mock("../store/useAuthStore", () => ({ useToLogin: () => mocks.toLogin }));
vi.mock("../store/useSettingsStore", () => ({ useStartRoute: () => "/dashboard" }));
vi.mock("../utils/analytics", () => ({
  trackProductEventOnce: mocks.trackProductEventOnce,
}));

afterEach(() => {
  mocks.registerRequest.mockReset();
  mocks.toLogin.mockReset();
  mocks.trackProductEventOnce.mockReset();
});

describe("registration analytics", () => {
  it("records start and completion around a successful registration", async () => {
    mocks.registerRequest.mockResolvedValue({
      id: 42,
      name: "Тест",
      email: "test@example.com",
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Ваше имя"), {
      target: { value: "Тест" },
    });
    fireEvent.change(screen.getByLabelText("Почта"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Пароль (минимум 8 символов)"), {
      target: { value: "password1" },
    });
    fireEvent.change(screen.getByLabelText("Подтвердите пароль"), {
      target: { value: "password1" },
    });
    fireEvent.click(screen.getByLabelText(/Я соглашаюсь с/));
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => {
      expect(mocks.registerRequest).toHaveBeenCalledWith({
        name: "Тест",
        email: "test@example.com",
        password: "password1",
      });
    });

    expect(mocks.trackProductEventOnce).toHaveBeenNthCalledWith(
      1,
      "signup_started"
    );
    expect(mocks.trackProductEventOnce).toHaveBeenNthCalledWith(
      2,
      "signup_completed"
    );
    expect(mocks.toLogin).toHaveBeenCalledWith(42, "Тест", "test@example.com");
  });
});
