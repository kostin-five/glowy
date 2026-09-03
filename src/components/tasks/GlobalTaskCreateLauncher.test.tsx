// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlobalTaskCreateLauncher from "./GlobalTaskCreateLauncher";
import { openTaskCreateLauncher } from "./taskCreateLauncher";

vi.mock("./CreateTaskModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Создать задачу">
      <button type="button" onClick={onClose}>Закрыть</button>
    </div>
  ),
}));

describe("GlobalTaskCreateLauncher", () => {
  it("owns one dialog and closes it without changing the route", async () => {
    render(<GlobalTaskCreateLauncher />);

    act(() => {
      openTaskCreateLauncher();
      openTaskCreateLauncher();
    });

    expect(await screen.findAllByRole("dialog", { name: "Создать задачу" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
