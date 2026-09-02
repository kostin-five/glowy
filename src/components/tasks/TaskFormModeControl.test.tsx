// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TaskFormModeControl from "./TaskFormModeControl";
import { getTaskFormSections } from "./taskFormPresentation";

afterEach(cleanup);

describe("TaskFormModeControl", () => {
  it("shows the three Russian modes and reports a selection", () => {
    const onChange = vi.fn();

    render(<TaskFormModeControl mode="medium" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Средне" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Коротко" }));
    expect(onChange).toHaveBeenCalledWith("compact");
  });

  it("applies progressive disclosure and field preferences", () => {
    const preferences = {
      mode: "medium" as const,
      fields: { energy: false, priority: true },
    };

    expect(getTaskFormSections("compact", preferences)).toMatchObject({
      details: false,
      priority: false,
      energy: false,
      subtasks: false,
    });
    expect(getTaskFormSections("medium", preferences)).toMatchObject({
      details: true,
      priority: true,
      energy: false,
      subtasks: false,
    });
    expect(getTaskFormSections("full", preferences)).toMatchObject({
      details: true,
      priority: true,
      energy: false,
      actualMinutes: true,
      subtasks: true,
    });
  });
});
