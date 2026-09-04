// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlowyAiOrb from "./GlowyAiOrb";

describe("GlowyAiOrb", () => {
  it("exposes an accessible central action", () => {
    render(<GlowyAiOrb onClick={vi.fn()} isActive={false} />);

    expect(
      screen.getByRole("button", { name: "Открыть ассистента" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("glowy-ai-orbit")).toHaveClass("glowy-ai-orbit");
  });
});
