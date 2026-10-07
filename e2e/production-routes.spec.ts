import { expect, test } from "@playwright/test";

test("does not expose the developer showcase in the production build", async ({ page }) => {
  await page.goto("/__design-system/foundations?theme=dark");
  await expect(page.getByRole("heading", { name: "Спокойная основа интерфейса" })).toHaveCount(0);
  await expect(page.getByTestId("foundation-orbit")).toHaveCount(0);
  await expect(page.locator("#root")).not.toBeEmpty();
});
