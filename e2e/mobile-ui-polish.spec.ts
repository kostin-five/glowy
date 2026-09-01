import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const task = {
  id: 7,
  title: "Подготовить план недели",
  date: "2026-08-28",
  priority: "⚡️ P2",
  category: "Работа",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel: "med",
  estimatedMinutes: 45,
  actualMinutes: null,
  subtasks: [
    { id: 1, taskId: 7, title: "Черновик", completed: true, position: 0 },
    { id: 2, taskId: 7, title: "Проверка", completed: false, position: 1 },
  ],
};

const analyticsSnapshot = {
  period: { kind: "week", from: "2026-08-24", to: "2026-08-30" },
  completedTasks: 2,
  dailyCompleted: [{ date: "2026-08-28", completedTasks: 2 }],
  energyDistribution: { low: 0, med: 2, high: 0 },
  taskStreak: 2,
  time: {
    estimatedMinutes: 45,
    actualMinutes: 35,
    tasksWithEstimate: 1,
    tasksWithActual: 1,
  },
  hasActivity: true,
  canUseFocusFeatures: true,
  focusBetaAvailable: true,
  focusBetaEnabled: true,
  canRequestAiInsight: true,
};

const prepareApp = async (page: Page) => {
  let activeUserId = 1;
  let currentTask = { ...task };
  const updates: Array<Record<string, unknown>> = [];

  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    localStorage.setItem("auth-storage", JSON.stringify({
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
    }));
  });

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (path === "/api/auth/me") {
      return fulfillJson(route, {
        id: activeUserId,
        name: `Тест ${activeUserId}`,
        email: `test-${activeUserId}@example.com`,
        xp: 0,
        level: 1,
        avatarId: "orbit-indigo",
        aiTone: "calm",
      });
    }
    if (path === "/api/tasks" && request.method() === "GET") {
      return fulfillJson(route, [currentTask]);
    }
    if (path === "/api/tasks/7" && request.method() === "PUT") {
      const update = request.postDataJSON() as Record<string, unknown>;
      updates.push(update);
      currentTask = { ...currentTask, ...update };
      return fulfillJson(route, currentTask);
    }
    if (path === "/api/user/progress") {
      return fulfillJson(route, { xp: 0, level: 1 });
    }
    if (path === "/api/user/preferences") {
      return fulfillJson(route, {
        avatarId: "orbit-indigo",
        aiTone: "calm",
        focusBetaEnabled: true,
        canUseFocusFeatures: true,
        focusBetaAvailable: true,
      });
    }
    if (path === "/api/analytics" && request.method() === "GET") {
      return fulfillJson(route, analyticsSnapshot);
    }
    if (path === "/api/analytics/insight" && request.method() === "POST") {
      return fulfillJson(route, {
        insight: "## Итог\n\n- **Ритм** сохраняется",
        cost: 5,
        usage: { limit: 70, remaining: 65, resetAt: "2026-08-29T00:00:00Z" },
      });
    }
    return fulfillJson(route, {});
  });

  return {
    updates,
    switchUser: (userId: number) => { activeUserId = userId; },
  };
};

test.describe("mobile UI polish", () => {
  test("keeps the dashboard read-only and the real orb animation enabled", async ({ page }) => {
    await prepareApp(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: /Привет,/ })).toBeVisible();
    await expect(page.getByLabel("Подзадачи: 1 из 2").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Отметить задачу выполненной" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Удалить задачу" })).toHaveCount(0);
    await expect.poll(() => page.locator(".glowy-ai-orbit").first().evaluate((element) =>
      getComputedStyle(element).animationName
    )).not.toBe("none");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.locator(".glowy-ai-orbit").first().evaluate((element) =>
      getComputedStyle(element).animationName
    )).toBe("none");
  });

  test("keeps filters visible at 320 px and moves a selected task to tomorrow", async ({ page }) => {
    const server = await prepareApp(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/tasks");

    await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Активные/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Выполненные/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Все/ })).toBeVisible();

    await page.getByRole("button", { name: "Выбрать" }).click();
    await page.getByRole("button", {
      name: "Выбрать задачу для массового действия",
      exact: true,
    }).click();
    await expect(page.getByRole("button", { name: "Снять" })).toHaveCount(0);
    await page.getByRole("button", { name: "На завтра" }).click();

    await expect.poll(() => server.updates.length).toBe(1);
    expect(server.updates[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByText("Перенесено задач: 1.")).toBeVisible();
  });

  test("restores a report after route and reload but isolates another account", async ({ page }) => {
    const server = await prepareApp(page);
    await page.goto("/analytics");
    await page.getByRole("button", { name: "Разобрать неделю · 5 запросов" }).click();
    await expect(page.getByRole("heading", { name: "Итог" })).toBeVisible();

    await page.goto("/tasks");
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Итог" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Итог" })).toBeVisible();

    server.switchUser(2);
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem("auth-storage") ?? "{}");
      stored.state.userId = 2;
      localStorage.setItem("auth-storage", JSON.stringify(stored));
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Итог" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Разобрать неделю · 5 запросов" })).toBeVisible();
  });

  test("fits compact widths and keeps the desktop chat header clear of the sidebar toggle", async ({ page }) => {
    await prepareApp(page);
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto("/tasks");
      await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ai");
    const toggle = page.getByRole("button", { name: "Скрыть навигацию" });
    const heading = page.getByRole("heading", { name: "Glowy AI" });
    await expect(toggle).toBeVisible();
    await expect(heading).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    const headingBox = await heading.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(headingBox!.x);

    await toggle.click();
    await expect(page.getByRole("link", { name: "Главная" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Показать навигацию" })).toBeVisible();
  });
});
