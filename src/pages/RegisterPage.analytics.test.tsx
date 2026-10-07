// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "./RegisterPage";

const mocks = vi.hoisted(() => ({
  registerRequest: vi.fn(),
  telegramRegister: vi.fn(),
  allowAutoRestore: vi.fn(),
  toLogin: vi.fn(),
  trackProductEventOnce: vi.fn(),
  bridge: { isTelegramMiniApp: false, webApp: null as null | { initData: string } },
}));

vi.mock("../api/AuthApi", () => ({
  AuthApi: { registerRequest: mocks.registerRequest },
}));
vi.mock("../api/TelegramMiniAppApi", () => ({
  TelegramMiniAppApi: { register: mocks.telegramRegister },
}));
vi.mock("../telegram/telegramMiniAppContext", () => ({
  useTelegramMiniApp: () => mocks.bridge,
}));
vi.mock("../telegram/telegramMiniAppSession", () => ({
  allowTelegramMiniAppAutoRestore: mocks.allowAutoRestore,
}));

vi.mock("../store/useAuthStore", () => ({ useToLogin: () => mocks.toLogin, useAuthStore: { getState: () => ({ toDemoLogin: vi.fn() }) } }));
vi.mock("../store/useSettingsStore", () => ({ useStartRoute: () => "/dashboard" }));
vi.mock("../utils/analytics", () => ({
  trackProductEventOnce: mocks.trackProductEventOnce,
}));

beforeEach(() => vi.stubEnv("VITE_REGISTRATION_ENABLED", "true"));
afterEach(() => {
  vi.unstubAllEnvs();
  mocks.registerRequest.mockReset();
  mocks.telegramRegister.mockReset();
  mocks.allowAutoRestore.mockReset();
  mocks.toLogin.mockReset();
  mocks.trackProductEventOnce.mockReset();
  mocks.bridge = { isTelegramMiniApp: false, webApp: null };
});

describe("registration analytics", () => {
  it("shows a closed registration screen without requesting an account", () => {
    vi.stubEnv("VITE_REGISTRATION_ENABLED", "false");
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Регистрация закрыта" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Почта")).not.toBeInTheDocument();
    expect(mocks.registerRequest).not.toHaveBeenCalled();
    expect(mocks.telegramRegister).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Открыть демо без регистрации" })).toBeInTheDocument();
  });
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

  it("uses the familiar registration screen with the Telegram channel adapter", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.telegramRegister.mockResolvedValue({
      id: 43,
      name: "Тест",
      email: "telegram@example.com",
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Начать путь/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ваше имя"), { target: { value: "Тест" } });
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "telegram@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль (минимум 8 символов)"), { target: { value: "password1" } });
    fireEvent.change(screen.getByLabelText("Подтвердите пароль"), { target: { value: "password1" } });
    fireEvent.click(screen.getByLabelText(/Я соглашаюсь с/));
    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => expect(mocks.telegramRegister).toHaveBeenCalledWith({
      initData: "signed",
      name: "Тест",
      email: "telegram@example.com",
      password: "password1",
    }));
    expect(mocks.registerRequest).not.toHaveBeenCalled();
    expect(mocks.allowAutoRestore).toHaveBeenCalledOnce();
  });
});
