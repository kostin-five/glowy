import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown, status = 200) => route.fulfill({
  status, contentType: "application/json", body: JSON.stringify(body),
});

const prepareApp = async (page: Page) => {
  let failMonth = true;
  let insightCalls = 0;
  let pendingInsight: Route | null = null;
  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    localStorage.setItem("auth-storage", JSON.stringify({
      state: { userId: 1, isAuthenticated: true, isGuest: false, isChecking: false,
        name: "Тест", email: "test@example.com", avatarId: "orbit-indigo",
        aiTone: "calm", token: null, currentEnergy: 80 }, version: 4,
    }));
  });
  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/\/$/, "");
    if (path === "/api/auth/me") return fulfillJson(route, {
      id: 1, name: "Тест", email: "test@example.com", xp: 0, level: 1,
      avatarId: "orbit-indigo", aiTone: "calm",
    });
    if (path === "/api/tasks") return fulfillJson(route, []);
    if (path === "/api/user/progress") return fulfillJson(route, { xp: 0, level: 1 });
    if (path === "/api/analytics") {
      const kind = url.searchParams.get("period") || "week";
      if (kind === "month" && failMonth) return fulfillJson(route, { error: "Тест: период временно недоступен" }, 503);
      return fulfillJson(route, {
        period: { kind, from: "2026-08-24", to: "2026-08-30" },
        completedTasks: kind === "week" ? 2 : 7,
        dailyCompleted: [{ date: "2026-08-24", completedTasks: kind === "week" ? 2 : 7 }],
        energyDistribution: { low: 0, med: 2, high: 0 }, taskStreak: 1,
        time: { estimatedMinutes: 40, actualMinutes: 30, tasksWithEstimate: 2, tasksWithActual: 1 },
        hasActivity: true, canUseFocusFeatures: true, focusBetaAvailable: true,
        focusBetaEnabled: true, canRequestAiInsight: true,
      });
    }
    if (path === "/api/analytics/insight") {
      insightCalls += 1;
      if (insightCalls > 1) { pendingInsight = route; return; }
      return fulfillJson(route, {
        insight: "## Тестовый итог\n\nРитм недели сохранён.", cost: 5,
        usage: { limit: 70, remaining: 65, resetAt: "2026-09-04T00:00:00Z" },
      });
    }
    return fulfillJson(route, {});
  });
  return {
    allowMonth: () => { failMonth = false; },
    failMonth: () => { failMonth = true; },
    insightCalls: () => insightCalls,
    rejectInsight: async () => {
      expect(pendingInsight).not.toBeNull();
      await fulfillJson(pendingInsight!, { error: "Тест: разбор временно недоступен" }, 503);
    },
  };
};

test("retries the current period without stale metrics at compact and desktop widths", async ({ page }) => {
  const server = await prepareApp(page);
  for (const width of [320, 360, 390, 430, 1280]) {
    server.failMonth();
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/analytics");
    await expect(page.getByText("за эту неделю", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Месяц", exact: true }).click();
    await expect(page.getByText("Тест: период временно недоступен")).toBeVisible();
    await expect(page.getByText("за эту неделю", { exact: true })).not.toBeVisible();
    server.allowMonth();
    await page.getByRole("button", { name: "Повторить", exact: true }).click();
    await expect(page.getByText("за этот месяц", { exact: true })).toBeVisible();
    await expect(page.getByText("7", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("keeps a report readable during regeneration and visibly restores controls after failure", async ({ page }) => {
    test.skip(process.env.VITE_ANALYTICS_AI_REPORT_ENABLED !== "true", "Проверка скрытого блока отчёта");
  const server = await prepareApp(page);
  await page.goto("/analytics");
  await page.getByRole("button", { name: "Разобрать неделю · 5 запросов" }).click();
  await expect(page.getByRole("heading", { name: "Тестовый итог" })).toBeVisible();
  await page.getByRole("button", { name: "Новый отчёт" }).click();
  await page.getByRole("button", { name: "Сделать новый", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Готовлю глубокий разбор" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Тестовый итог" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Удалить отчёт" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Новый отчёт" })).toBeDisabled();
  await expect.poll(server.insightCalls).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await server.rejectInsight();
  await expect(page.getByText("Тест: разбор временно недоступен")).toBeVisible();
  await expect(page.getByRole("button", { name: "Новый отчёт" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Удалить отчёт" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Тестовый итог" })).toBeVisible();
});
