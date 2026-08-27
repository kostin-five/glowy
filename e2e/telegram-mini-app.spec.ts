import { expect, test, type Page, type Route } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const user = {
  id: 42,
  name: "Telegram Test",
  email: "telegram@example.com",
  xp: 120,
  level: 2,
  avatarId: "orbit-indigo",
  aiTone: "calm",
};

const fulfill = (route: Route, body: unknown) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const prepareMiniApp = async (
  page: Page,
  { registrationRequired = false }: { registrationRequired?: boolean } = {}
) => {
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.Telegram={WebApp:{initData:"signed-test-launch",colorScheme:"dark",themeParams:{bg_color:"#020617",text_color:"#f8fafc"},viewportHeight:window.innerHeight,viewportStableHeight:window.innerHeight,safeAreaInset:{top:0,bottom:0,left:0,right:0},contentSafeAreaInset:{top:0,bottom:0,left:0,right:0},ready:function(){},expand:function(){},onEvent:function(){},offEvent:function(){},BackButton:{show:function(){},hide:function(){},onClick:function(){},offClick:function(){}}}};`,
    })
  );
  await page.addInitScript(() => {
    try {
      localStorage.setItem("glowy_cookie_consent", "rejected");
    } catch {
      // about:blank may not expose storage; the script runs again for the app origin.
    }
  });

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/telegram/mini-app/session" && registrationRequired) {
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "TELEGRAM_REGISTRATION_REQUIRED" }),
      });
    }
    if (path === "/api/telegram/mini-app/session" || path === "/api/auth/me") {
      return fulfill(route, user);
    }
    if (path === "/api/tasks" || path === "/api/notes") return fulfill(route, []);
    if (path === "/api/user/progress") return fulfill(route, { xp: 120, level: 2 });
    if (path === "/api/progress") {
      return fulfill(route, {
        xp: { current: 120, level: 2, nextLevelAt: 250 },
        taskStreak: { current: 0, longest: 0, days: [], missedDateEligibleForRescue: null },
        rescues: { remaining: 3, monthlyLimit: 3, usedDates: [] },
        habits: [],
        achievements: [],
        canUseFocusFeatures: true,
      });
    }
    if (path === "/api/analytics") {
      return fulfill(route, {
        completedTasks: 0,
        dailyCompleted: [],
        energyDistribution: { low: 0, med: 0, high: 0 },
        taskStreak: 0,
        time: { estimatedMinutes: 0, actualMinutes: 0, tasksWithEstimate: 0, tasksWithActual: 0 },
        hasActivity: false,
        canUseFocusFeatures: true,
        focusBetaAvailable: true,
        focusBetaEnabled: true,
        canRequestAiInsight: true,
      });
    }
    return fulfill(route, {});
  });
};

const targets = {
  home: "/dashboard",
  tasks: "/tasks",
  notes: "/notes",
  ai: "/ai",
  progress: "/stairs",
  analytics: "/analytics",
  settings: "/settings",
};

for (const width of [320, 360, 390, 430]) {
  for (const [target, pathname] of Object.entries(targets)) {
    test(`${target} Mini App target fits ${width} px without a white screen`, async ({ page }) => {
      await prepareMiniApp(page);
      await page.setViewportSize({ width, height: 780 });
      await page.goto(`/telegram?target=${target}`);
      await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
      await expect(page.locator("main").first()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(overflow.content).toBeLessThanOrEqual(overflow.viewport);
    });
  }
}

for (const width of [320, 360, 390, 430]) {
  test(`registration fits ${width} px inside the Mini App`, async ({ page }) => {
    await prepareMiniApp(page, { registrationRequired: true });
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/telegram");

    await expect(page.getByRole("heading", { name: "Создать аккаунт Glowy" })).toBeVisible();
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(overflow.content).toBeLessThanOrEqual(overflow.viewport);
  });
}

test("ordinary browser access to /telegram shows a controlled state", async ({ page }) => {
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
  );
  await page.goto("/telegram");
  await expect(page.getByRole("heading", { name: "Откройте Glowy из Telegram" })).toBeVisible();
});
