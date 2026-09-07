// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FoundationShowcase from "./FoundationShowcase";
import {
  FOUNDATION_SHOWCASE_PATH,
  isFoundationShowcasePath,
} from "./foundationShowcaseRoute";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  document.body.classList.remove("dark");
  window.history.replaceState({}, "", "/");
});

describe("FoundationShowcase", () => {
  it("is available only at its technical route", () => {
    expect(isFoundationShowcasePath(FOUNDATION_SHOWCASE_PATH)).toBe(true);
    expect(isFoundationShowcasePath("/dashboard")).toBe(false);
  });

  it("renders stable token states without product data", () => {
    window.history.replaceState({}, "", `${FOUNDATION_SHOWCASE_PATH}?theme=light`);
    render(<FoundationShowcase />);

    expect(screen.getByRole("heading", { name: "Спокойная основа интерфейса" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Проверить фокус" })).toBeVisible();
    expect(screen.getByTestId("foundation-orbit")).toBeVisible();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("applies the requested dark token theme without app navigation", () => {
    window.history.replaceState({}, "", `${FOUNDATION_SHOWCASE_PATH}?theme=dark`);
    render(<FoundationShowcase />);

    expect(document.documentElement).toHaveClass("dark");
    expect(document.body).toHaveClass("dark");
  });
});
