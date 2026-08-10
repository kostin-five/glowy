// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import LoginPage from "./LoginPage";

const mocks = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  toLogin: vi.fn(),
}));

vi.mock("../api/AuthApi", () => ({
  AuthApi: { loginRequest: mocks.loginRequest },
}));
vi.mock("../store/useAuthStore", () => ({ useToLogin: () => mocks.toLogin }));
vi.mock("../store/useSettingsStore", () => ({ useStartRoute: () => "/dashboard" }));

afterEach(() => {
  mocks.loginRequest.mockReset();
  mocks.toLogin.mockReset();
});

describe("login errors", () => {
  it("explains a connection failure without blaming the user's credentials", async () => {
    const networkError = new axios.AxiosError("Network Error");
    networkError.request = {};
    mocks.loginRequest.mockRejectedValue(networkError);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Введите почту"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти в систему" }));

    await waitFor(() => {
      expect(
        screen.getByText("Не удалось подключиться к серверу. Попробуйте ещё раз через минуту.")
      ).toBeInTheDocument();
    });
  });
});
