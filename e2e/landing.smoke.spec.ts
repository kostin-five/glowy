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

  test("opens the registration form", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { level: 1, name: /Начать путь с Glowy/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Ваше имя")).toBeVisible();
    await expect(page.getByLabel("Почта")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Зарегистрироваться" }),
    ).toBeDisabled();
  });

  test("keeps public entry usable at compact mobile widths", async ({ browser }) => {
    for (const width of [360, 390, 430]) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
      });
      const page = await context.newPage();

      await page.goto("/");
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Превращай хаос мыслей в спокойный план дня",
        }),
      ).toBeVisible();
      await expect(
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).resolves.toBe(true);

      await page.goto("/register");
      await expect(page.getByLabel("Ваше имя")).toBeVisible();
      await expect(
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).resolves.toBe(true);

      await context.close();
    }
  });
});
