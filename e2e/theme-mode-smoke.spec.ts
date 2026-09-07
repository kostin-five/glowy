import { expect, test } from "@playwright/test";

const themeCases = [
  { name: "light", themeMode: "light", colorScheme: "dark", expectsDark: false },
  { name: "dark", themeMode: "dark", colorScheme: "light", expectsDark: true },
  { name: "system", themeMode: "system", colorScheme: "dark", expectsDark: true },
] as const;

for (const themeCase of themeCases) {
  test(`keeps the existing ${themeCase.name} theme contract`, async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) {
        apiRequests.push(request.url());
      }
    });

    await page.emulateMedia({ colorScheme: themeCase.colorScheme });
    await page.addInitScript((themeMode) => {
      localStorage.setItem("glowy_cookie_consent", "rejected");
      localStorage.setItem("glowy-settings", JSON.stringify({
        state: { themeMode },
        version: 0,
      }));
      localStorage.setItem("auth-storage", JSON.stringify({
        state: {
          isAuthenticated: false,
          isGuest: true,
          isChecking: false,
          userId: null,
          name: "",
          email: null,
          avatarId: "orbit-indigo",
          aiTone: "calm",
          token: null,
          currentEnergy: 100,
        },
        version: 4,
      }));
    }, themeCase.themeMode);

    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /С возвращением в/ })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(
      themeCase.expectsDark ? /dark/ : /^(?!.*dark)/,
    );
    await expect.poll(() => apiRequests).toEqual([]);
  });
}
