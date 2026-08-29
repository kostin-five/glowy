// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";

vi.mock("../mind/MindHubChat", () => ({
  default: () => <div>Компактный AI-чат</div>,
}));

const Location = () => {
  const location = useLocation();
  return <output aria-label="Текущий маршрут">{location.pathname}</output>;
};

const renderNav = (route = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <BottomNav />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("BottomNav", () => {
  it("renders the requested five actions in order", () => {
    renderNav();

    const navigation = screen.getByRole("navigation", {
      name: "Основная мобильная навигация",
    });
    const actions = Array.from(
      navigation.querySelectorAll("a, button")
    ).map((element) => element.textContent?.trim() || element.getAttribute("aria-label"));

    expect(actions).toEqual([
      "Главная",
      "Задачи",
      "Открыть Glowy AI",
      "Мой прогресс",
      "Ещё",
    ]);
    expect(navigation).toHaveClass(
      "pb-[max(env(safe-area-inset-bottom),var(--tg-content-safe-area-inset-bottom,0px))]"
    );
  });

  it("opens one quick AI sheet and closes it explicitly", async () => {
    renderNav();

    fireEvent.click(screen.getByRole("button", { name: "Открыть Glowy AI" }));

    expect(screen.getByRole("dialog", { name: "Быстрая разгрузка" })).toBeInTheDocument();
    expect(screen.getByText("Компактный AI-чат")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Закрыть быструю разгрузку" })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Быстрая разгрузка" })
      ).not.toBeInTheDocument()
    );
  });

  it("opens the quick sheet from another mobile call to action", () => {
    renderNav();

    act(() => window.dispatchEvent(new Event("glowy:open-mobile-ai")));

    expect(
      screen.getByRole("dialog", { name: "Быстрая разгрузка" })
    ).toBeInTheDocument();
  });

  it("closes the quick sheet with Escape", async () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Открыть Glowy AI" }));

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Быстрая разгрузка" })
      ).not.toBeInTheDocument()
    );
  });

  it("opens the full chat from the quick sheet", async () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Открыть Glowy AI" }));
    fireEvent.click(screen.getByRole("button", { name: /Полный чат/ }));

    expect(screen.getByLabelText("Текущий маршрут")).toHaveTextContent("/ai");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Быстрая разгрузка" })
      ).not.toBeInTheDocument()
    );
  });

  it("keeps progress, analytics and settings reachable", async () => {
    renderNav();

    fireEvent.click(screen.getByRole("link", { name: "Мой прогресс" }));
    expect(screen.getByLabelText("Текущий маршрут")).toHaveTextContent("/progress");

    fireEvent.click(screen.getByRole("button", { name: "Открыть меню «Ещё»" }));
    expect(screen.getByRole("dialog", { name: "Ещё" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Аналитика" }));
    expect(screen.getByLabelText("Текущий маршрут")).toHaveTextContent("/analytics");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Ещё" })).not.toBeInTheDocument()
    );
  });

  it("marks More active on settings and navigates from its sheet", async () => {
    renderNav("/settings");

    const moreButton = screen.getByRole("button", {
      name: "Открыть меню «Ещё»",
    });
    expect(moreButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(moreButton);
    fireEvent.click(screen.getByRole("link", { name: "Настройки" }));

    expect(screen.getByLabelText("Текущий маршрут")).toHaveTextContent(
      "/settings"
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Ещё" })).not.toBeInTheDocument()
    );
  });
});
