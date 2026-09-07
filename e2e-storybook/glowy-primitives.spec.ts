import { expect, test } from "@playwright/test";

const storyUrl = (storyId: string) =>
  `/iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`;

test("catalog stories stay isolated from product API requests", async ({ page }) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      apiRequests.push(request.url());
    }
  });

  await page.goto(storyUrl("primitives-действия--default"));
  await expect(page.getByRole("button", { name: "Добавить задачу" })).toBeVisible();
  await expect.poll(() => apiRequests).toEqual([]);
});

test("dialog closes with Escape and returns focus to its trigger", async ({ page }) => {
  await page.goto(storyUrl("primitives-оверлеи--dialog-keyboard"));

  const trigger = page.getByRole("button", { name: "Открыть диалог" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Небольшая пауза" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Небольшая пауза" })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile sheet remains keyboard-closeable and its controls meet the touch target", async ({
  page,
}) => {
  await page.goto(
    `${storyUrl("primitives-оверлеи--mobile-sheet")}&globals=viewport:compact`
  );

  const trigger = page.getByRole("button", { name: "Открыть панель" });
  const bounds = await trigger.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);

  await trigger.click();
  await expect(page.getByRole("dialog", { name: "План на вечер" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "План на вечер" })).toBeHidden();
  await expect(trigger).toBeFocused();
});
