import { expect, test } from "@playwright/test";

test.describe("public pricing", () => {
  test("keeps the closed Founder offer unavailable", async ({ page }) => {
    await page.goto("/pricing");

    await expect(
      page.getByRole("heading", { level: 1, name: "Тарифы и лимиты" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Founder" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Оформление отключено" }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: /Оформить Founder/i })).toHaveCount(0);
  });
});
