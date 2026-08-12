// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlowyAiPage from "./GlowyAiPage";

vi.mock("../components/mind/MindHubChat", () => ({
  default: ({ variant }: { variant: string }) => (
    <div data-testid="mind-hub-chat" data-variant={variant}>
      Общий разговор
    </div>
  ),
}));

describe("GlowyAiPage", () => {
  it("renders the shared chat as a full page", () => {
    const { container } = render(<GlowyAiPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Glowy AI" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("mind-hub-chat")).toHaveAttribute(
      "data-variant",
      "page"
    );
    expect(container.firstElementChild).toHaveClass("h-full", "min-h-0");
  });
});
