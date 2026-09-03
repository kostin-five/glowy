import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const prepareApp = async (page: Page) => {
  let aiRequests = 0;

  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    localStorage.removeItem("glowy-mind-hub-conversation");
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          userId: 1,
          isAuthenticated: true,
          isGuest: false,
          isChecking: false,
          name: "Тест",
          email: "test@example.com",
          avatarId: "orbit-indigo",
          aiTone: "calm",
          token: null,
          currentEnergy: 80,
        },
        version: 4,
      })
    );
  });

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");

    if (path === "/api/auth/me") {
      return fulfillJson(route, {
        id: 1,
        name: "Тест",
        email: "test@example.com",
        xp: 0,
        level: 1,
        avatarId: "orbit-indigo",
        aiTone: "calm",
      });
    }
    if (path === "/api/ai/mind-hub") {
      aiRequests += 1;
      return fulfillJson(route, {
        drafts: [],
        reply: "Начнём с одного спокойного шага.",
        limit: { limit: 70, remaining: 69, resetAt: null },
      });
    }
    if (path === "/api/tasks") return fulfillJson(route, []);
    if (path === "/api/user/progress") {
      return fulfillJson(route, { xp: 0, level: 1 });
    }

    return fulfillJson(route, {});
  });

  return { getAiRequests: () => aiRequests };
};

test("prepares a starter request and clears the local dialog only after confirmation", async ({
  page,
}) => {
  const server = await prepareApp(page);
  await page.goto("/ai");

  await page.getByRole("button", { name: /Собрать план на день/ }).click();
  await expect(page.getByPlaceholder(/Например:/)).toHaveValue(
    /три главных шага/
  );
  expect(server.getAiRequests()).toBe(0);

  await page.getByRole("button", { name: "Отправить мысли" }).click();
  await expect(page.getByText("Начнём с одного спокойного шага.")).toBeVisible();
  await expect(page.getByText("Ты", { exact: true })).toBeVisible();
  await expect(page.getByText("Glowy", { exact: true })).toBeVisible();
  expect(server.getAiRequests()).toBe(1);

  await page.getByRole("button", { name: "Очистить историю" }).click();
  await expect(
    page.getByRole("dialog", { name: "Подтверждение очистки истории" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Отмена" }).click();
  await expect(page.getByText("Начнём с одного спокойного шага.")).toBeVisible();

  await page.getByRole("button", { name: "Очистить историю" }).click();
  await page.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(page.getByRole("button", { name: /Собрать план на день/ })).toBeVisible();
});

test("keeps the AI starter surface inside compact viewports", async ({ page }) => {
  await prepareApp(page);

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto("/ai");
    await expect(page.getByRole("button", { name: /Подготовить задачу/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  }
});
