import { expect, test, type Page, type Route } from "@playwright/test";

const today = "2026-08-16";

const habit = (title: string) => ({
  id: 1,
  title,
  archived: false,
  checkedToday: false,
  checkDates: [],
  currentStreak: 0,
  createdAt: "2026-08-16T08:00:00.000Z",
  updatedAt: "2026-08-16T08:00:00.000Z",
});

const progressOverview = (habits: ReturnType<typeof habit>[] = []) => ({
  xp: { current: 120, level: 2, nextLevelAt: 300 },
  taskStreak: {
    current: 3,
    longest: 5,
    lastActiveOn: today,
    days: ["2026-08-14", "2026-08-15", today],
    missedDateEligibleForRescue: null,
    calendar: {
      month: "2026-08",
      from: "2026-07-27",
      to: "2026-09-06",
      canGoPrevious: true,
      canGoNext: false,
      days: Array.from({ length: 42 }, (_, index) => {
        const date = new Date(Date.UTC(2026, 6, 27 + index));
        const value = date.toISOString().slice(0, 10);
        return {
          date: value,
          inMonth: value.startsWith("2026-08"),
          state: index === 10 ? "active" : index === 11 ? "rescued" : "missed",
        };
      }),
    },
  },
  rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
  habits,
  achievements: [],
  canUseFocusFeatures: true,
});

const analyticsSnapshot = {
  period: { kind: "week", from: "2026-08-10", to: today },
  completedTasks: 4,
  dailyCompleted: [
    { date: "2026-08-10", completedTasks: 0 },
    { date: "2026-08-11", completedTasks: 1 },
    { date: "2026-08-12", completedTasks: 0 },
    { date: "2026-08-13", completedTasks: 1 },
    { date: "2026-08-14", completedTasks: 0 },
    { date: "2026-08-15", completedTasks: 1 },
    { date: today, completedTasks: 1 },
  ],
  energyDistribution: { low: 1, med: 2, high: 1 },
  taskStreak: 3,
  time: {
    estimatedMinutes: 180,
    actualMinutes: 150,
    tasksWithEstimate: 3,
    tasksWithActual: 3,
  },
  hasActivity: true,
  canUseFocusFeatures: true,
  focusBetaAvailable: true,
  focusBetaEnabled: true,
  canRequestAiInsight: true,
};

const fulfillJson = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const prepareAuthenticatedApp = async (page: Page) => {
  let habits: ReturnType<typeof habit>[] = [];

  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
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
        version: 3,
      })
    );
  });

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, "");

    if (path === "/api/auth/me") {
      return fulfillJson(route, {
        id: 1,
        name: "Тест",
        email: "test@example.com",
        xp: 120,
        level: 2,
        avatarId: "orbit-indigo",
        aiTone: "calm",
      });
    }

    if (path === "/api/tasks" && request.method() === "GET") {
      return fulfillJson(route, []);
    }

    if (path === "/api/user/progress") {
      return fulfillJson(route, { xp: 120, level: 2 });
    }

    if (path === "/api/user/preferences" && request.method() === "GET") {
      return fulfillJson(route, {
        avatarId: "orbit-indigo",
        aiTone: "calm",
        focusBetaEnabled: true,
        canUseFocusFeatures: true,
        focusBetaAvailable: true,
      });
    }

    if (path === "/api/user/preferences" && request.method() === "PATCH") {
      const patch = request.postDataJSON() as { aiTone?: string; avatarId?: string };
      return fulfillJson(route, {
        avatarId: patch.avatarId ?? "orbit-indigo",
        aiTone: patch.aiTone ?? "calm",
        focusBetaEnabled: true,
        canUseFocusFeatures: true,
        focusBetaAvailable: true,
      });
    }

    if (path === "/api/progress/habits" && request.method() === "POST") {
      const createdHabit = habit(
        (request.postDataJSON() as { title: string }).title
      );
      habits = [createdHabit];
      return fulfillJson(route, createdHabit);
    }

    if (path === "/api/progress" && request.method() === "GET") {
      return fulfillJson(route, progressOverview(habits));
    }

    if (path === "/api/analytics/insight" && request.method() === "POST") {
      return fulfillJson(route, {
        insight: "Ритм устойчивый: фактическое время немного ниже плана.",
        cost: 5,
        usage: {
          limit: 70,
          remaining: 62,
          resetAt: "2026-08-17T00:00:00.000Z",
        },
      });
    }

    if (path === "/api/analytics" && request.method() === "GET") {
      return fulfillJson(route, analyticsSnapshot);
    }

    return fulfillJson(route, {});
  });
};

test.describe("personal progress releases", () => {
  test.beforeEach(async ({ page }) => {
    await prepareAuthenticatedApp(page);
  });

  test("creates a habit from My progress", async ({ page }) => {
    await page.goto("/progress");

    await page.getByRole("tab", { name: "Привычки" }).click();
    await page
      .getByPlaceholder("Например: прочитать 10 страниц")
      .fill("Прогулка после обеда");
    await page.getByRole("button", { name: "Добавить" }).click();

    await expect(page.getByText("Прогулка после обеда")).toBeVisible();
  });

  test("redirects the legacy progress address to the canonical route", async ({ page }) => {
    await page.goto("/stairs");

    await expect(page).toHaveURL(/\/progress$/);
    await expect(page.getByRole("heading", { name: "Мой прогресс" })).toBeVisible();
  });

  test("shows a weighted Focus insight after an explicit request", async ({ page }) => {
    await page.goto("/analytics");

    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
    await page
      .getByRole("button", { name: "Разобрать неделю · 5 запросов" })
      .click();

    await expect(
      page.getByText("Ритм устойчивый: фактическое время немного ниже плана.")
    ).toBeVisible();
  });

  test("keeps the one-time task hint usable on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile layout check");

    await page.goto("/tasks");
    await page.getByRole("button", { name: "Добавить задачу" }).click();

    const hint = page.getByRole("status").filter({
      hasText: "Начни с названия",
    });
    await expect(hint).toBeVisible();
    const box = await hint.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);

    await page.getByRole("button", { name: "Закрыть подсказку" }).click();
    await expect(hint).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Сохранить" })).toBeVisible();
  });

  test("observes a saved strict behavior mode within three seconds", async ({ page }) => {
    await page.goto("/settings");
    const strict = page.getByRole("button", { name: /Жёсткий/ });

    await strict.click();

    await expect(strict).toHaveAttribute("aria-pressed", "true", { timeout: 3_000 });
  });

  test("keeps the rhythm calendar within 320–430 px viewports", async ({ page }) => {
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/progress");
      await page.getByRole("tab", { name: "Стрик побед" }).click();
      const calendar = page.getByLabel("Календарь ритма");
      await expect(calendar).toBeVisible();
      const box = await calendar.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  });
});
