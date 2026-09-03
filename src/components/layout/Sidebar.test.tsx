// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

const settings = vi.hoisted(() => ({ collapsed: false }));

vi.mock("../../store/useAuthStore", () => ({
  useName: () => "Тест",
  useAvatarId: () => "aurora",
}));

vi.mock("../../store/useSettingsStore", () => ({
  useIsDarkMode: () => false,
  useIsSidebarCollapsed: () => settings.collapsed,
  useToggleSidebarCollapsed: () => vi.fn(),
}));

vi.mock("../../hooks/useLogout", () => ({
  useLogout: () => vi.fn(),
}));

describe("Sidebar", () => {
  settings.collapsed = false;
  it("links the desktop chat item to the full Glowy AI page", () => {
    render(
      <MemoryRouter initialEntries={["/ai"]}>
        <Sidebar />
      </MemoryRouter>
    );

    const chatLink = screen.getByRole("link", { name: "Чат" });
    expect(chatLink).toHaveAttribute("href", "/ai");
    expect(chatLink).toHaveClass("text-indigo-400", "bg-indigo-500/10");
  });

  it("removes route links from the collapsed state", () => {
    settings.collapsed = true;
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.queryByRole("link", { name: "Главная" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Твои задачи" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Показать навигацию" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Новая задача" })).not.toBeInTheDocument();
    expect(screen.getByAltText("Логотип Glowy")).toHaveClass("h-16", "w-16");
  });
});
