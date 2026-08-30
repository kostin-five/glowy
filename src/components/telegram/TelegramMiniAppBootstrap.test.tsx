// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TelegramMiniAppBootstrap from "./TelegramMiniAppBootstrap";

const mocks = vi.hoisted(() => ({
  restore: vi.fn(),
  toLogin: vi.fn(),
  autoRestoreBlocked: false,
  bridge: { isTelegramMiniApp: false, webApp: null as null | { initData: string } },
}));

vi.mock("../../api/TelegramMiniAppApi", () => ({
  TelegramMiniAppApi: { restore: mocks.restore },
}));
vi.mock("../../telegram/telegramMiniAppContext", () => ({
  useTelegramMiniApp: () => mocks.bridge,
}));
vi.mock("../../store/useAuthStore", () => ({
  useAuthStore: (selector: (state: { toLogin: typeof mocks.toLogin }) => unknown) =>
    selector({ toLogin: mocks.toLogin }),
}));
vi.mock("../../telegram/telegramMiniAppSession", () => ({
  isTelegramMiniAppAutoRestoreBlocked: () => mocks.autoRestoreBlocked,
}));

const renderBootstrap = (entry = "/telegram") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/telegram" element={<TelegramMiniAppBootstrap />} />
        <Route path="/tasks" element={<div>Раздел задач</div>} />
        <Route path="/dashboard" element={<div>Главная</div>} />
        <Route path="/login" element={<div>Привычный вход</div>} />
        <Route path="/register" element={<div>Привычная регистрация</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("TelegramMiniAppBootstrap", () => {
  beforeEach(() => {
    mocks.restore.mockReset();
    mocks.toLogin.mockReset();
    mocks.autoRestoreBlocked = false;
    mocks.bridge = { isTelegramMiniApp: false, webApp: null };
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("shows a controlled state outside Telegram", async () => {
    renderBootstrap();
    expect(await screen.findByText("Откройте Glowy из Telegram")).toBeInTheDocument();
  });

  it("restores a linked user and follows only an allowed target", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.restore.mockResolvedValue({ id: 1, name: "Анна", email: "anna@example.com" });
    renderBootstrap("/telegram?target=tasks");
    expect(await screen.findByText("Раздел задач")).toBeInTheDocument();
    expect(mocks.toLogin).toHaveBeenCalledWith(1, "Анна", "anna@example.com");
  });

  it("opens the ordinary registration screen for a fresh Telegram user", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.restore.mockRejectedValue({
      isAxiosError: true,
      response: { data: { code: "TELEGRAM_REGISTRATION_REQUIRED" } },
    });
    renderBootstrap();
    await waitFor(() => expect(screen.getByText("Привычная регистрация")).toBeInTheDocument());
  });

  it("opens the ordinary login screen after explicit logout without restoring", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.autoRestoreBlocked = true;

    renderBootstrap("/telegram?target=tasks");

    expect(await screen.findByText("Привычный вход")).toBeInTheDocument();
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("shows an unauthorized state for expired Telegram launch data", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "expired" } };
    mocks.restore.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: "TELEGRAM_INIT_DATA_EXPIRED" } },
    });

    renderBootstrap();

    expect(await screen.findByText("Сессия Telegram устарела")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
  });

  it("keeps a visible loading state during a slow restore", () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.restore.mockReturnValue(new Promise(() => undefined));

    renderBootstrap();

    expect(screen.getByRole("status", { name: "Загрузка страницы" })).toBeInTheDocument();
  });

  it("shows the offline state before the first login without making a request", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    renderBootstrap();

    expect(await screen.findByText("Для первого входа нужен интернет")).toBeInTheDocument();
    expect(mocks.restore).not.toHaveBeenCalled();
  });

  it("retries a transient failure and follows a safe default for an invalid target", async () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    mocks.restore
      .mockRejectedValueOnce({ isAxiosError: true, request: {} })
      .mockResolvedValueOnce({ id: 1, name: "Анна", email: "anna@example.com" });

    renderBootstrap("/telegram?target=https://evil.example");
    fireEvent.click(await screen.findByRole("button", { name: "Повторить" }));

    expect(await screen.findByText("Главная")).toBeInTheDocument();
    expect(mocks.restore).toHaveBeenCalledTimes(2);
  });

  it("aborts session restore when the bootstrap unmounts", () => {
    mocks.bridge = { isTelegramMiniApp: true, webApp: { initData: "signed" } };
    let requestSignal: AbortSignal | undefined;
    mocks.restore.mockImplementation((_initData, signal) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });

    const { unmount } = renderBootstrap();
    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });
});
