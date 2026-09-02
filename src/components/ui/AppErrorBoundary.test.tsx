// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";

const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

afterEach(() => {
  consoleError.mockClear();
  vi.useRealTimers();
});

describe("AppErrorBoundary", () => {
  it("shows a recovery state when a child screen fails", () => {
    const BrokenScreen = () => {
      throw new Error("Controlled test failure");
    };

    render(
      <AppErrorBoundary>
        <BrokenScreen />
      </AppErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "Не удалось загрузить этот экран" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Перезагрузить экран" })
    ).toBeInTheDocument();
  });

  it("retries rendering when the user chooses recovery", () => {
    const RecoveryScreen = () => {
      const [isBroken, setIsBroken] = useState(true);
      const BrokenContent = () => {
        if (isBroken) {
          throw new Error("Controlled retry failure");
        }

        return <p>Экран снова доступен</p>;
      };

      return (
        <AppErrorBoundary onRetry={() => setIsBroken(false)}>
          <BrokenContent />
        </AppErrorBoundary>
      );
    };

    render(<RecoveryScreen />);

    fireEvent.click(
      screen.getByRole("button", { name: "Перезагрузить экран" })
    );

    expect(screen.getByText("Экран снова доступен")).toBeInTheDocument();
  });

  it("shows reload progress and reloads the page after a route failure", () => {
    vi.useFakeTimers();
    const reloadPage = vi.fn();
    const BrokenScreen = () => {
      throw new Error("Controlled route failure");
    };

    render(
      <AppErrorBoundary reloadPage={reloadPage}>
        <BrokenScreen />
      </AppErrorBoundary>
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Перезагрузить экран" })
    );

    expect(screen.getByRole("button", { name: "Перезагружаю…" })).toBeDisabled();
    expect(reloadPage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
