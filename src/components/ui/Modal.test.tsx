// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

afterEach(cleanup);

describe("Modal", () => {
  it("labels the dialog and provides an explicit close action", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Новая задача">
        <button type="button">Действие</button>
      </Modal>
    );

    expect(screen.getByRole("dialog", { name: "Новая задача" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses one responsive panel for mobile sheet and desktop dialog", () => {
    render(
      <Modal isOpen onClose={() => undefined} title="Форма">
        Содержимое
      </Modal>
    );

    const panel = screen.getByTestId("modal-panel");
    expect(panel).toHaveClass("rounded-t-3xl", "sm:rounded-2xl");
    expect(panel).toHaveClass("max-h-[calc(100dvh-1rem)]", "sm:max-h-[90vh]");
  });
});
