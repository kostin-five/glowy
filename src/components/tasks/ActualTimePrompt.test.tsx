// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActualTimePrompt from "./ActualTimePrompt";

afterEach(() => {
  cleanup();
});

describe("ActualTimePrompt", () => {
  it("saves the entered duration and closes the prompt", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ActualTimePrompt
        isOpen
        estimatedMinutes={30}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Минуты"), {
      target: { value: "45" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(45);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("can be skipped without recording a duration", () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ActualTimePrompt
        isOpen
        estimatedMinutes={null}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps invalid durations from being saved", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ActualTimePrompt
        isOpen
        estimatedMinutes={null}
        onClose={() => undefined}
        onSave={onSave}
      />
    );

    const saveButton = screen.getByRole("button", { name: "Сохранить" });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Минуты"), {
      target: { value: "1441" },
    });
    expect(saveButton).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
