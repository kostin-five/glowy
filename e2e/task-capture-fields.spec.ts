import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const prepareApp = async (page: Page) => {
  const createdPayloads: Array<Record<string, unknown>> = [];

  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
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
          currentEnergy: 100,
        },
        version: 4,
      })
    );
    localStorage.setItem(
      "glowy-settings",
      JSON.stringify({
        state: {
          shownOnboardingHints: ["taskCreation"],
          taskFormPreferencesByAccount: {
            "user:1": {
              mode: "compact",
              fields: { energy: true, priority: true },
            },
          },
        },
        version: 0,
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
    if (path === "/api/tasks" && request.method() === "GET") {
      return fulfillJson(route, []);
    }
    if (path === "/api/tasks" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      createdPayloads.push(payload);
      return fulfillJson(route, {
        id: 100 + createdPayloads.length,
        userId: 1,
        ...payload,
        completed: false,
        completedOn: null,
        xpAwarded: false,
        actualMinutes: null,
        subtasks: [],
      });
    }
    if (path === "/api/user/progress") {
      return fulfillJson(route, { xp: 0, level: 1 });
    }
    return fulfillJson(route, {});
  });

  return createdPayloads;
};

test("creates one title-only task with the responsive sheet", async ({ page }) => {
  const payloads = await prepareApp(page);
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/tasks");

  await page.getByRole("button", { name: "Добавить задачу" }).click();
  const dialog = page.getByRole("dialog", { name: "Создать задачу" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Коротко" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByLabel("Дата задачи")).toHaveCount(0);
  await page.getByLabel("Название задачи").fill("Записаться к врачу");
  await page.getByRole("button", { name: "Сохранить задачу" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Записаться к врачу").first()).toBeVisible();
  // Optimistic UI appears before the offline queue sends the create request.
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0]).toMatchObject({
    title: "Записаться к врачу",
    date: "",
    priority: "⚡️ P2",
    energyLevel: "med",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBe(true);
});

test("keeps the task dialog usable at supported compact widths", async ({ page }, testInfo) => {
  await prepareApp(page);

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Добавить задачу" }).click();
    await expect(page.getByLabel("Название задачи")).toBeVisible();
    await expect(page.getByRole("button", { name: "Закрыть" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await page.getByRole("button", { name: "Закрыть" }).click();
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tasks");
  const opener = page.getByRole("button", { name: "Добавить задачу" });
  await opener.click();
  if (testInfo.project.name === "chromium") {
    await expect(page.getByLabel("Название задачи")).toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Создать задачу" })).toHaveCount(0);
  if (testInfo.project.name === "chromium") {
    await expect(opener).toBeFocused();
  }
});
