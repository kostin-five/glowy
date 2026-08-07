import { expect, test } from "@playwright/test";

test.describe("public landing", () => {
  test("opens the product entry point and registration path", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Превращай хаос мыслей в спокойный план дня",
      }),
    ).toBeVisible();

    await expect(page.getByRole("link", { name: "Регистрация" })).toHaveAttribute(
      "href",
      "/register",
    );
  });
});
