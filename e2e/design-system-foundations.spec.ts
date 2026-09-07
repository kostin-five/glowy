import { expect, test } from "@playwright/test";

const foundationPath = "/__design-system/foundations";
const canCompareVisualBaseline = process.platform === "darwin";

for (const theme of ["light", "dark"] as const) {
  test(`captures the ${theme} foundation showcase without product requests`, async ({ page }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) {
        apiRequests.push(request.url());
      }
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${foundationPath}?theme=${theme}`);

    await expect(page.getByRole("heading", { name: "Спокойная основа интерфейса" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
    await expect.poll(() => apiRequests).toEqual([]);

    const actionButton = page.getByRole("button", { name: "Спокойное действие" });
    const focusButton = page.getByRole("button", { name: "Проверить фокус" });
    await page.keyboard.press("Tab");
    await expect(actionButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(focusButton).toBeFocused();
    await expect(focusButton).toHaveCSS("outline-style", "solid");

    const actionBox = await actionButton.boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionBox!.height).toBeGreaterThanOrEqual(44);

    await expect.poll(() => page.getByTestId("foundation-orbit").evaluate((element) =>
      getComputedStyle(element).animationName,
    )).toBe("none");

    if (canCompareVisualBaseline) {
      await expect(page).toHaveScreenshot(`foundation-${theme}.png`, {
        animations: "disabled",
        fullPage: true,
      });
    }
  });
}
