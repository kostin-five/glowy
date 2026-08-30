// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import LoginPage from "./LoginPage";

const mocks = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  telegramLogin: vi.fn(),
  allowAutoRestore: vi.fn(),
  toLogin: vi.fn(),
  bridge: { isTelegramMiniApp: false, webApp: null as null | { initData: string } },
}));

vi.mock("../api/AuthApi", () => ({
  AuthApi: { loginRequest: mocks.loginRequest },
}));
vi.mock("../api/TelegramMiniAppApi", () => ({
  TelegramMiniAppApi: { login: mocks.telegramLogin },
}));
vi.mock("../telegram/telegramMiniAppContext", () => ({
  useTelegramMiniApp: () => mocks.bridge,
}));
vi.mock("../telegram/telegramMiniAppSession", () => ({
  allowTelegramMiniAppAutoRestore: mocks.allowAutoRestore,
}));
vi.mock("../store/useAuthStore", () => ({ useToLogin: () => mocks.toLogin }));
vi.mock("../store/useSettingsStore", () => ({ useStartRoute: () => "/dashboard" }));

afterEach(() => {
  mocks.loginRequest.mockReset();
  mocks.telegramLogin.mockReset();
  mocks.allowAutoRestore.mockReset();
  mocks.toLogin.mockReset();
  mocks.bridge = { isTelegramMiniApp: false, webApp: null };
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

  it("uses the familiar login screen with the Telegram channel adapter", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.telegramLogin.mockResolvedValue({
      id: 7,
      name: "Тест",
      email: "test@example.com",
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/С возвращением/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Введите почту"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти в систему" }));

    await waitFor(() => expect(mocks.telegramLogin).toHaveBeenCalledWith({
      initData: "signed",
      email: "test@example.com",
      password: "password1",
    }));
    expect(mocks.loginRequest).not.toHaveBeenCalled();
    expect(mocks.allowAutoRestore).toHaveBeenCalledOnce();
  });
});
