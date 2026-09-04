import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

const prepareApp = async (page: Page) => {
  const created: Array<Record<string, unknown>> = [];
  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        userId: 1, isAuthenticated: true, isGuest: false, isChecking: false,
        name: "Тест", email: "test@example.com", avatarId: "orbit-indigo",
        aiTone: "calm", token: null, currentEnergy: 80,
      },
      version: 4,
    }));
    localStorage.setItem("glowy-settings", JSON.stringify({
      state: {
        shownOnboardingHints: ["taskCreation"],
        taskFormPreferencesByAccount: {
          "user:1": { mode: "compact", fields: { energy: true, priority: true } },
        },
      },
      version: 0,
    }));
  });

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (path === "/api/auth/me") {
      return fulfillJson(route, { id: 1, name: "Тест", email: "test@example.com", xp: 0, level: 1, avatarId: "orbit-indigo", aiTone: "calm" });
    }
    if (path === "/api/tasks" && request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, unknown>;
      created.push(payload);
      return fulfillJson(route, { id: 100 + created.length, userId: 1, ...payload, completed: false, completedOn: null, xpAwarded: false, actualMinutes: null, subtasks: [] });
    }
    if (path === "/api/tasks") return fulfillJson(route, []);
    if (path === "/api/user/progress") return fulfillJson(route, { xp: 0, level: 1 });
    return fulfillJson(route, {});
  });
  return created;
};

test("creates a task from the tasks action without leaving the route", async ({ page }) => {
  const created = await prepareApp(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tasks");

  await page.getByRole("button", { name: "Добавить задачу" }).click();
  const dialog = page.getByRole("dialog", { name: "Создать задачу" });
  await expect(dialog).toHaveCount(1);
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByLabel("Название задачи").fill("Записать идею из аналитики");
  await page.getByRole("button", { name: "Сохранить задачу" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/tasks$/);
  await expect.poll(() => created.length).toBe(1);
});

test("keeps the mobile launcher usable at supported widths", async ({ page }) => {
  await prepareApp(page);
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Новая задача" }).click();
    await expect(page.getByRole("dialog", { name: "Создать задачу" })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Отмена" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
});

test("uses the same launcher from tasks and full-screen Glowy AI", async ({ page }) => {
  await prepareApp(page);
  await page.setViewportSize({ width: 390, height: 760 });

  await page.goto("/tasks");
  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await expect(page.getByRole("dialog", { name: "Создать задачу" })).toHaveCount(1);
  await page.getByRole("button", { name: "Закрыть" }).click();

  await page.goto("/ai");
  await page.getByRole("button", { name: "Новая задача" }).click();
  await expect(page.getByRole("dialog", { name: "Создать задачу" })).toHaveCount(1);
  await expect(page).toHaveURL(/\/ai$/);
});
