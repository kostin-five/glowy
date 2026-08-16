// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserApi } from "../api/UserApi";
import ProfilePreferencesPanel from "../components/profile/ProfilePreferencesPanel";
import { useAuthStore } from "../store/useAuthStore";

const basePreferences = {
  avatarId: "orbit-indigo" as const,
  aiTone: "calm" as const,
  focusBetaEnabled: false,
  canUseFocusFeatures: false,
  focusBetaAvailable: false,
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ avatarId: "orbit-indigo", aiTone: "calm" });
  vi.spyOn(UserApi, "getPreferences").mockResolvedValue(basePreferences);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("profile preferences", () => {
  it("loads saved preferences and updates avatar in shared auth state", async () => {
    const update = vi.spyOn(UserApi, "updatePreferences").mockResolvedValue({
      ...basePreferences,
      avatarId: "orbit-mint",
    });

    render(
      <MemoryRouter>
        <ProfilePreferencesPanel isGuest={false} onSaved={() => undefined} />
      </MemoryRouter>
    );
    await screen.findByRole("button", { name: /Мята/ });
    fireEvent.click(screen.getByRole("button", { name: /Мята/ }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ avatarId: "orbit-mint" });
      expect(useAuthStore.getState().avatarId).toBe("orbit-mint");
    });
  });

  it("offers three tones and persists the strict respectful mode", async () => {
    vi.spyOn(UserApi, "getPreferences").mockResolvedValue({
      ...basePreferences,
      canUseFocusFeatures: true,
    });
    const update = vi.spyOn(UserApi, "updatePreferences").mockResolvedValue({
      ...basePreferences,
      aiTone: "strict",
      canUseFocusFeatures: true,
    });

    render(
      <MemoryRouter>
        <ProfilePreferencesPanel isGuest={false} onSaved={() => undefined} />
      </MemoryRouter>
    );
    await screen.findByRole("button", { name: /Строго/ });
    fireEvent.click(screen.getByRole("button", { name: /Строго/ }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ aiTone: "strict" });
      expect(useAuthStore.getState().aiTone).toBe("strict");
    });
  });
});
