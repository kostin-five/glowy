// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";

const telegram = vi.hoisted(() => ({
  value: { isTelegramMiniApp: false, webApp: null as null | { BackButton: {
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    onClick: ReturnType<typeof vi.fn>;
    offClick: ReturnType<typeof vi.fn>;
  } } },
}));

vi.mock("../telegram/telegramMiniAppContext", () => ({
  useTelegramMiniApp: () => telegram.value,
}));

vi.mock("../components/layout/Sidebar", () => ({
  default: () => <aside>Боковая навигация</aside>,
}));

vi.mock("../components/layout/Header", () => ({
  default: () => <header>Общая шапка</header>,
}));

vi.mock("../components/layout/BottomNav", () => ({
  default: () => <nav>Нижняя навигация</nav>,
}));

const renderLayout = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AppLayout>
        <div>Содержимое страницы</div>
      </AppLayout>
    </MemoryRouter>
  );

describe("AppLayout", () => {
  beforeEach(() => {
    telegram.value = { isTelegramMiniApp: false, webApp: null };
  });

  it("gives the mobile AI route the full screen above bottom navigation", () => {
    renderLayout("/ai");

    expect(screen.queryByText("Общая шапка")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass(
      "overflow-hidden",
      "p-0",
      "pb-[calc(4rem+max(env(safe-area-inset-bottom),var(--tg-content-safe-area-inset-bottom,0px)))]",
      "lg:pb-0"
    );
    expect(screen.getByText("Нижняя навигация")).toBeInTheDocument();
  });

  it("keeps the shared header on regular routes", () => {
    renderLayout("/");

    expect(screen.getByText("Общая шапка")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("overflow-y-auto", "px-4");
  });

  it("uses native Telegram back controls and content safe areas", () => {
    const backButton = {
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn(),
      offClick: vi.fn(),
    };
    telegram.value = { isTelegramMiniApp: true, webApp: { BackButton: backButton } };

    const { unmount } = renderLayout("/tasks");

    expect(backButton.show).toHaveBeenCalledOnce();
    expect(backButton.onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("main").parentElement?.parentElement).toHaveStyle({
      paddingTop: "var(--tg-content-safe-area-inset-top, 0px)",
    });
    unmount();
    expect(backButton.offClick).toHaveBeenCalledOnce();
  });
});
