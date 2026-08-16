// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar";

vi.mock("../../store/useAuthStore", () => ({
  useName: () => "Тест",
  useAvatarId: () => "aurora",
}));

vi.mock("../../store/useSettingsStore", () => ({
  useIsDarkMode: () => false,
  useIsSidebarCollapsed: () => false,
  useToggleSidebarCollapsed: () => vi.fn(),
}));

vi.mock("../../hooks/useLogout", () => ({
  useLogout: () => vi.fn(),
}));

describe("Sidebar", () => {
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
});
