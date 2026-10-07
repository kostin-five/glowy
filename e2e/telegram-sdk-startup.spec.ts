import { expect, test, type Page, type Route } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const user = {
  id: 42,
  name: "Telegram Test",
  email: "telegram@example.com",
  xp: 0,
  level: 1,
  avatarId: "orbit-indigo",
  aiTone: "calm",
};

const webAppScript = (initData = "synthetic-launch") =>
  `window.Telegram={WebApp:{initData:${JSON.stringify(initData)},colorScheme:"dark",themeParams:{bg_color:"#020617",text_color:"#f8fafc"},viewportHeight:window.innerHeight,viewportStableHeight:window.innerHeight,ready:function(){},expand:function(){},onEvent:function(){},offEvent:function(){},BackButton:{show:function(){},hide:function(){},onClick:function(){},offClick:function(){}}}};`;

const fulfillJson = (route: Route, body: unknown, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const prepareApi = async (page: Page) => {
  let sessionRequests = 0;
  let hasServerSession = false;
  await page.addInitScript(() => {
    try {
      localStorage.setItem("glowy_cookie_consent", "rejected");
    } catch {
      // The app origin receives the same init script after navigation.
    }
  });
  await page.route(/^http:\/\/localhost:3001\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, "");
    if (path === "/api/telegram/mini-app/session") {
      sessionRequests += 1;
      hasServerSession = true;
      return fulfillJson(route, user);
    }
    if (path === "/api/auth/me") {
      if (hasServerSession) return fulfillJson(route, user);
      return fulfillJson(route, {
        message: "Пользователь не авторизован",
        code: "AUTH_UNAUTHORIZED",
      }, 401);
    }
    if (path === "/api/tasks" || path === "/api/notes") return fulfillJson(route, []);
    if (path === "/api/user/progress") return fulfillJson(route, { xp: 0, level: 1 });
    return fulfillJson(route, {});
  });
  return () => sessionRequests;
};

test("ordinary web pages never request Telegram SDK", async ({ page }) => {
  let sdkRequests = 0;
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => {
    sdkRequests += 1;
    return route.abort();
  });
  await prepareApi(page);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /С возвращением в/ })).toBeVisible();
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Регистрация закрыта" })).toBeVisible();

  expect(sdkRequests).toBe(0);
});

test("an in-app transition to the Telegram entry starts isolated preparation", async ({ page }) => {
  let sdkRequests = 0;
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => {
    sdkRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: webAppScript(""),
    });
  });
  await prepareApi(page);

  await page.goto("/login");
  expect(sdkRequests).toBe(0);
  await page.evaluate(() => {
    history.pushState({}, "", "/telegram");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await expect(page.getByRole("heading", { name: "Откройте Glowy из Telegram" })).toBeVisible();
  expect(sdkRequests).toBe(1);
});

test("a delayed SDK keeps auth pending and then opens the safe target", async ({ page }) => {
  const sessionRequests = await prepareApi(page);
  let releaseSdk: (() => void) | undefined;
  await page.route("https://telegram.org/js/telegram-web-app.js*", async (route) => {
    await new Promise<void>((resolve) => {
      releaseSdk = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: webAppScript(),
    });
  });

  await page.goto("/telegram?target=tasks", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status", { name: "Подготовка Telegram" })).toBeVisible();
  expect(sessionRequests()).toBe(0);

  releaseSdk?.();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/tasks");
  await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
  expect(sessionRequests()).toBe(1);
});

test("an SDK error has an in-place retry without parallel requests", async ({ page }) => {
  await prepareApi(page);
  let sdkRequests = 0;
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => {
    sdkRequests += 1;
    if (sdkRequests === 1) return route.abort();
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: webAppScript(""),
    });
  });

  await page.goto("/telegram");
  await expect(page.getByRole("heading", { name: "Не удалось подготовить Telegram" })).toBeVisible();
  await page.getByRole("button", { name: "Повторить" }).click();

  await expect(page.getByRole("heading", { name: "Откройте Glowy из Telegram" })).toBeVisible();
  expect(sdkRequests).toBe(2);
});

test("a stalled SDK becomes a retryable error after ten seconds", async ({ page }) => {
  await prepareApi(page);
  await page.route("https://telegram.org/js/telegram-web-app.js*", () => new Promise(() => undefined));

  await page.goto("/telegram", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status", { name: "Подготовка Telegram" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Не удалось подготовить Telegram" })).toBeVisible({
    timeout: 12_000,
  });
  await expect(page.getByRole("button", { name: "Повторить" })).toBeEnabled();
});

test("a Mini App tab reload prepares SDK before showing its protected target", async ({ page }) => {
  await prepareApi(page);
  let sdkRequests = 0;
  await page.route("https://telegram.org/js/telegram-web-app.js*", (route) => {
    sdkRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: webAppScript(),
    });
  });

  await page.goto("/telegram?target=tasks");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/tasks");
  await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("glowy_telegram_mini_app_tab"))).toBe("1");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
  expect(sdkRequests).toBe(2);
});
