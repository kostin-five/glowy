// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserApi } from "../../api/UserApi";
import TelegramConnectionPanel from "./TelegramConnectionPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Telegram connection panel", () => {
  it("shows an unavailable state without offering a link code", async () => {
    vi.spyOn(UserApi, "getTelegramConnection").mockResolvedValue({
      available: false,
      botUsername: null,
      connected: false,
      connectedAt: null,
    });
    render(<TelegramConnectionPanel />);

    expect(await screen.findByText(/пока не настроен/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Подключить Telegram/ })).not.toBeInTheDocument();
  });

  it("creates and displays a single expiring code", async () => {
    vi.spyOn(UserApi, "getTelegramConnection").mockResolvedValue({
      available: true,
      botUsername: "glowy_test_bot",
      connected: false,
      connectedAt: null,
    });
    const createCode = vi.spyOn(UserApi, "createTelegramLinkCode").mockResolvedValue({
      code: "Abcd1234_-xy",
      expiresAt: "2026-08-26T20:10:00.000Z",
      deepLink: "https://t.me/glowy_test_bot?start=Abcd1234_-xy",
    });
    render(<TelegramConnectionPanel />);

    fireEvent.click(await screen.findByRole("button", { name: /Подключить Telegram/ }));
    expect(await screen.findByText("Abcd1234_-xy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Открыть бота/ })).toHaveAttribute(
      "href",
      "https://t.me/glowy_test_bot?start=Abcd1234_-xy"
    );
    expect(createCode).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation before unlinking", async () => {
    vi.spyOn(UserApi, "getTelegramConnection").mockResolvedValue({
      available: true,
      botUsername: "glowy_test_bot",
      connected: true,
      connectedAt: "2026-08-26T20:00:00.000Z",
    });
    const unlink = vi.spyOn(UserApi, "unlinkTelegram").mockResolvedValue({ ok: true });
    render(<TelegramConnectionPanel />);

    fireEvent.click(await screen.findByRole("button", { name: /Отключить Telegram/ }));
    expect(unlink).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Да, отключить/ }));
    await waitFor(() => expect(unlink).toHaveBeenCalledTimes(1));
  });
});
