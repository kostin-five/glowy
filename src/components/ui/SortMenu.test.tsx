// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTaskStore } from "../../store/useTaskStore";
import SortMenu from "./SortMenu";

describe("SortMenu", () => {
  beforeEach(() => {
    useTaskStore.setState({ sortField: "date", sortDirection: "desc" });
  });

  afterEach(() => {
    cleanup();
    useTaskStore.setState({ sortField: null, sortDirection: "asc" });
  });

  it("allows the user to turn sorting off", () => {
    render(<SortMenu />);

    const select = screen.getByRole("combobox", {
      name: "Сортировка задач",
    });

    fireEvent.change(select, { target: { value: "" } });

    expect(screen.getByRole("option", { name: "Без сортировки" })).toBeVisible();
    expect(select).toHaveValue("");
    expect(useTaskStore.getState().sortField).toBeNull();
    expect(useTaskStore.getState().sortDirection).toBe("asc");
  });
});
