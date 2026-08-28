// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafeReportMarkdown from "./SafeReportMarkdown";

describe("SafeReportMarkdown", () => {
  it("renders headings, lists and bold without marker text", () => {
    render(<SafeReportMarkdown text={"## Итог\n\n- **Первый** шаг\n- Второй шаг"} />);
    expect(screen.getByRole("heading", { name: "Итог" })).toBeVisible();
    expect(screen.getByText("Первый").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps raw HTML inert as visible text", () => {
    const { container } = render(<SafeReportMarkdown text={'<img src=x onerror="alert(1)">'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeVisible();
  });
});
