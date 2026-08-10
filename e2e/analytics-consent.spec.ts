import { expect, test } from "@playwright/test";

const metrikaScriptSelector = 'script[src*="mc.yandex.ru/metrika/tag.js"]';

test.describe("analytics consent", () => {
  test("does not initialize Metrika after analytics rejection", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Мы используем cookie")).toBeVisible();
    await page.getByRole("button", { name: "Отказаться" }).click();

    await expect(page.locator(metrikaScriptSelector)).toHaveCount(0);
  });

  test("initializes Metrika only after analytics acceptance", async ({ page }) => {
    await page.route("https://mc.yandex.ru/**", (route) => route.abort());
    await page.goto("/");

    await page.getByRole("button", { name: "Принять" }).click();

    await expect(page.locator(metrikaScriptSelector)).toHaveCount(1);
  });
});
