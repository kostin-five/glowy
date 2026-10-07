import { expect, test } from "@playwright/test";

test.describe("portfolio privacy and CSP", () => {
  test("never loads analytics even with previously accepted consent", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => { if (/mc\.yandex|yastatic/.test(request.url())) requests.push(request.url()); });
    await page.addInitScript(() => localStorage.setItem("glowy_cookie_consent", "accepted"));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Мы используем cookie", { exact: true })).toHaveCount(0);
    await expect(page.locator('script[src*="mc.yandex"]')).toHaveCount(0);
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Регистрация закрыта" })).toBeVisible();
    expect(requests).toEqual([]);
  });

  test("enforces the deployment CSP and blocks untrusted inline code", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.headers()["content-security-policy"]).toContain("script-src 'self' https://telegram.org");
    expect(response?.headers()["content-security-policy-report-only"]).toBeUndefined();
    await expect(page.getByRole("heading", { name: /С возвращением/ })).toBeVisible();
    const ran = await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "document.documentElement.dataset.untrustedExecuted = 'yes'";
      document.head.append(script);
      return document.documentElement.dataset.untrustedExecuted;
    });
    expect(ran).toBeUndefined();
    await page.getByRole("button", { name: "Открыть демо без регистрации", exact: true }).click();
    await expect(page.getByText("Сегодня", { exact: true }).first()).toBeVisible();
  });
});
