// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { demoTransaction } from "../../demo/demoStorage";
import { UserApi } from "../../api/UserApi";
import { useAuthStore } from "../../store/useAuthStore";
import ProfilePreferencesPanel from "./ProfilePreferencesPanel";

vi.mock("../../demo/demoStorage", () => ({ demoTransaction: vi.fn() }));
vi.mock("../../api/UserApi", () => ({ UserApi: { getPreferences: vi.fn(), updatePreferences: vi.fn() } }));
const preferences = { avatarId: "orbit-indigo" as const, aiTone: "calm" as const, canUseFocusFeatures: false, focusBetaEnabled: false, focusBetaAvailable: false };
beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ isGuest: true, userId: null, token: "demo-token-test", avatarId: "orbit-indigo", aiTone: "calm" });
  vi.mocked(demoTransaction).mockResolvedValue(preferences);
});
const show = (isGuest = true) => render(<MemoryRouter><ProfilePreferencesPanel isGuest={isGuest} onSaved={() => undefined} /></MemoryRouter>);

it("loads and saves the guest avatar locally without UserApi or entitlement", async () => {
  show();
  await waitFor(() => expect(demoTransaction).toHaveBeenCalledOnce());
  vi.mocked(demoTransaction).mockResolvedValue({ ...preferences, avatarId: "orbit-mint" });
  fireEvent.click(screen.getByRole("button", { name: "Мята" }));
  await waitFor(() => expect(useAuthStore.getState().avatarId).toBe("orbit-mint"));
  expect(UserApi.getPreferences).not.toHaveBeenCalled();
  expect(UserApi.updatePreferences).not.toHaveBeenCalled();
  expect((screen.getByRole("button", { name: /Умеренный/ }) as HTMLButtonElement).disabled || screen.getByRole("button", { name: /Умеренный/ }).closest("fieldset")?.disabled).toBe(true);
});

it("rolls back the avatar and displays a storage failure", async () => {
  show();
  await waitFor(() => expect(demoTransaction).toHaveBeenCalledOnce());
  vi.mocked(demoTransaction).mockRejectedValue(new Error("storage unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Мята" }));
  expect(await screen.findByText("Не удалось сохранить настройку. Попробуй ещё раз.")).toBeTruthy();
  expect(useAuthStore.getState().avatarId).toBe("orbit-indigo");
});

it("does not apply a late guest save to an account", async () => {
  show();
  await waitFor(() => expect(demoTransaction).toHaveBeenCalledOnce());
  let resolve!: (value: unknown) => void;
  vi.mocked(demoTransaction).mockReturnValue(new Promise(res => { resolve = res; }));
  fireEvent.click(screen.getByRole("button", { name: "Мята" }));
  act(() => useAuthStore.getState().toLogin(77, "Тест", "test@example.com"));
  await act(async () => resolve({ ...preferences, avatarId: "orbit-mint" }));
  expect(useAuthStore.getState().avatarId).toBe("orbit-indigo");
});

it("retains the account preference API", async () => {
  useAuthStore.setState({ isGuest: false, userId: 77 });
  vi.mocked(UserApi.getPreferences).mockResolvedValue(preferences);
  show(false);
  await screen.findByRole("button", { name: "Мята" });
  expect(UserApi.getPreferences).toHaveBeenCalledOnce();
  expect(demoTransaction).not.toHaveBeenCalled();
});
