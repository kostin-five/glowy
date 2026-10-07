import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 } });

test("portfolio screenshots use only the local guest demo", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("glowy_cookie_consent", "rejected"));
  await page.route(/^http:\/\/localhost:3001\/api\//, (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "AUTH_UNAUTHORIZED" }) }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Открыть демо без регистрации", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByText("Сегодня", { exact: true }).first()).toBeVisible();
  await page.goto("/tasks");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Твои задачи", exact: true })).toBeVisible();
  for (const title of ["Подготовить портфолио", "Спланировать спокойный день", "Прочитать главу книги"]) {
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).click();
    await page.getByLabel("Название задачи").fill(title);
    await page.getByRole("button", { name: "Сохранить задачу", exact: true }).click();
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  }
  await expect.poll(() => page.getByText("Прочитать главу книги", { exact: true }).first().evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 1) return false;
    return true;
  })).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  if (process.env.GLOWY_CAPTURE_README === "true") await page.screenshot({ path: "docs/screenshots/tasks.png", fullPage: true });
  await page.goto("/dashboard");
  await expect(page.getByText("Сегодня", { exact: true }).first()).toBeVisible();
  if (process.env.GLOWY_CAPTURE_README === "true") await page.screenshot({ path: "docs/screenshots/dashboard.png", fullPage: true });
});
