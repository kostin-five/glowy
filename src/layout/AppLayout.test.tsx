// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";

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
  it("gives the mobile AI route the full screen above bottom navigation", () => {
    renderLayout("/ai");

    expect(screen.queryByText("Общая шапка")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass(
      "overflow-hidden",
      "p-0",
      "pb-[calc(4rem+env(safe-area-inset-bottom))]",
      "lg:pb-0"
    );
    expect(screen.getByText("Нижняя навигация")).toBeInTheDocument();
  });

  it("keeps the shared header on regular routes", () => {
    renderLayout("/");

    expect(screen.getByText("Общая шапка")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("overflow-y-auto", "px-4");
  });
});
