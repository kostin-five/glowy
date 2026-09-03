// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Header from "./Header";

vi.mock("../../store/useAuthStore", () => ({
  useName: () => "Тест",
  useAvatarId: () => "aurora",
}));

vi.mock("../../store/useTaskStore", () => ({ useUserLevel: () => 3 }));

describe("Header", () => {
  it("opens task capture through an accessible touch target", () => {
    const listener = vi.fn();
    window.addEventListener("glowy:open-task-create", listener);
    render(<MemoryRouter><Header /></MemoryRouter>);

    const button = screen.getByRole("button", { name: "Новая задача" });
    expect(button).toHaveClass("h-11", "w-11");
    fireEvent.click(button);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("glowy:open-task-create", listener);
  });
});
