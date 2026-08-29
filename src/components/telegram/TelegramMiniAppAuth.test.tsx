// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TelegramMiniAppAuth from "./TelegramMiniAppAuth";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  openExternal: vi.fn((url: string) => url.length > 0),
}));

vi.mock("../../api/TelegramMiniAppApi", () => ({
  TelegramMiniAppApi: { register: mocks.register, login: mocks.login },
}));
vi.mock("../../telegram/telegramExternalLink", () => ({
  openTelegramExternalLink: mocks.openExternal,
}));

describe("TelegramMiniAppAuth", () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.login.mockReset();
    mocks.openExternal.mockClear();
  });

  it("registers an ordinary Glowy account only after legal consent", async () => {
    const user = { id: 1, name: "Анна", email: "anna@example.com", xp: 0, level: 1 };
    mocks.register.mockResolvedValue(user);
    const onAuthenticated = vi.fn();
    render(<TelegramMiniAppAuth initData="signed" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Анна" } });
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "anna@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password1" } });
    expect(screen.getByRole("button", { name: "Создать аккаунт" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    await waitFor(() => expect(mocks.register).toHaveBeenCalledWith({
      initData: "signed",
      name: "Анна",
      email: "anna@example.com",
      password: "password1",
    }));
    expect(onAuthenticated).toHaveBeenCalledWith(user);
  });

  it("allows an existing user to sign in with a legacy password", async () => {
    const user = { id: 2, name: "Иван", email: "ivan@example.com", xp: 10, level: 1 };
    mocks.login.mockResolvedValue(user);
    const onAuthenticated = vi.fn();
    render(<TelegramMiniAppAuth initData="signed" onAuthenticated={onAuthenticated} />);

    fireEvent.click(screen.getByRole("tab", { name: "Вход" }));
    expect(screen.queryByLabelText("Имя")).not.toBeInTheDocument();
    const passwordInput = screen.getByLabelText("Пароль");
    expect(passwordInput).not.toHaveAttribute("minlength");
    expect(passwordInput).not.toHaveAttribute("maxlength");

    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "ivan@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "old123" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith({
      initData: "signed",
      email: "ivan@example.com",
      password: "old123",
    }));
    expect(onAuthenticated).toHaveBeenCalledWith(user);
  });

  it("opens legal documents externally from the Mini App", () => {
    render(<TelegramMiniAppAuth initData="signed" onAuthenticated={vi.fn()} />);

    fireEvent.click(screen.getByRole("link", { name: "условия" }));

    expect(mocks.openExternal).toHaveBeenCalledOnce();
    expect(mocks.openExternal.mock.calls[0][0]).toMatch(/\/terms$/);
  });

  it("shows a controlled connection conflict without leaving the form", async () => {
    mocks.login.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "Telegram или аккаунт Glowy уже связан с другим профилем" } },
    });
    render(<TelegramMiniAppAuth initData="signed" onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Вход" }));
    fireEvent.change(screen.getByLabelText("Почта"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/уже связан/);
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
  });
});
