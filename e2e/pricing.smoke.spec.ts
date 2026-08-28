import { expect, test } from "@playwright/test";

test.describe("public pricing", () => {
  test("shows the future Forever offer without an activation path", async ({ page }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", { level: 1, name: "Тарифы и лимиты" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Forever" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Скоро" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Founder|Получить/i })).toHaveCount(0);
  });
});
