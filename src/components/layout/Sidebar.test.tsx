// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("opens task capture from the expanded navigation", () => {
    const listener = vi.fn();
    window.addEventListener("glowy:open-task-create", listener);
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Sidebar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Новая задача" }));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("glowy:open-task-create", listener);
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
    expect(screen.getByRole("button", { name: "Новая задача" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Новая задача" })).toHaveAttribute("title", "Новая задача");
    expect(screen.getByAltText("Логотип Glowy")).toHaveClass("h-16", "w-16");
  });
});
