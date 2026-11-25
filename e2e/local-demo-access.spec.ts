import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block", actionTimeout: 10_000 });

test("guest notes, habits, analytics and avatar persist locally without API requests", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => localStorage.setItem("glowy_cookie_consent", "rejected"));
  await page.route(/^http:\/\/localhost:3001\/api\//, route => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ code: "AUTH_UNAUTHORIZED" }),
  }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Открыть демо без регистрации", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  const requests: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
  await expect(page.getByRole("button", { name: "Настроить план" })).toHaveCount(0);

  await page.goto("/tasks");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).click();
  await page.getByLabel("Название задачи").fill("Демо-связь");
  await page.getByRole("button", { name: "Сохранить задачу", exact: true }).click();
  await expect(page.getByText("Демо-связь", { exact: true }).first()).toBeVisible();

  await page.goto("/notes");
  await page.getByRole("button", { name: "Новая заметка" }).click();
  await page.getByLabel("Заголовок заметки").fill("Локальная заметка");
  await page.getByLabel("Текст заметки", { exact: true }).fill("Синтетический текст демо");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Предложить задачу" })).toBeDisabled();
  await page.getByLabel("Связать с задачей").selectOption({ label: "Демо-связь" });
  await expect(page.getByLabel("Убрать связь с задачей «Демо-связь»")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Текст заметки", { exact: true })).toHaveValue("Синтетический текст демо");
  await expect(page.getByLabel("Убрать связь с задачей «Демо-связь»")).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("Текст заметки", { exact: true }).fill("Сохранено без сети");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByLabel("Текст заметки", { exact: true })).toHaveValue("Сохранено без сети");
  await page.getByRole("button", { name: "В архив", exact: true }).click();
  await page.getByRole("button", { name: "Архив", exact: true }).click();
  await page.getByRole("button", { name: /Локальная заметка/ }).click();
  await expect(page.getByRole("button", { name: "Восстановить", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Восстановить", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);

  await page.goto("/progress");
  await page.getByRole("tab", { name: "Привычки", exact: true }).click();
  await page.getByPlaceholder("Например: прочитать 10 страниц").fill("Демо-привычка");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByText("Демо-привычка", { exact: true })).toBeVisible();
  await context.setOffline(true);
  const check = page.locator("article").filter({ hasText: "Демо-привычка" }).locator("button[aria-pressed]:enabled").first();
  await check.click();
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await expect(check).toBeEnabled();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Убрать привычку в архив" }).click();
  await page.getByRole("button", { name: /Архив привычек/ }).click();
  await page.getByRole("button", { name: "Вернуть привычку" }).click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await page.getByRole("tab", { name: "Привычки", exact: true }).click();
  await expect(page.getByText("Демо-привычка", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Стрик побед", exact: true }).click();
  await expect(page.getByLabel("Календарь ритма", { exact: true })).toBeVisible();
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Глубокий разбор Glowy" })).toHaveCount(0);
  await page.getByRole("button", { name: "Месяц", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Глубокий разбор Glowy" })).toHaveCount(0);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Мята", exact: true }).click();
  await expect(page.getByText("Настройки сохранены", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Мята", exact: true })).toHaveAttribute("aria-pressed", "true");
  const energyField = page.getByRole("switch", { name: "Показывать энергию" });
  const wasVisible = await energyField.getAttribute("aria-checked");
  await energyField.click();
  await expect(energyField).toHaveAttribute("aria-checked", wasVisible === "true" ? "false" : "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Мята", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("switch", { name: "Показывать энергию" })).toHaveAttribute("aria-checked", wasVisible === "true" ? "false" : "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Выйти из аккаунта" }).last().click();
  await page.getByRole("button", { name: "Открыть демо без регистрации", exact: true }).click();
  await page.goto("/tasks");
  await expect(page.getByText("Демо-связь", { exact: true }).first()).toBeVisible();
  await page.goto("/notes");
  await page.getByRole("button", { name: /Локальная заметка/ }).click();
  await expect(page.getByLabel("Текст заметки", { exact: true })).toHaveValue("Сохранено без сети");
  await page.goto("/ai");
  await expect(page.locator("textarea")).toBeEnabled();
  await expect(page.getByText(/До 5 запросов за 24 часа/)).toBeVisible();
  expect(requests).toEqual([]);
});

test("unavailable local storage reports failure without a server fallback", async ({ page }) => {
  const requests: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined });
  });
  await page.route(/^http:\/\/localhost:3001\/api\//, route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Открыть демо без регистрации", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
  await page.goto("/notes");
  await page.getByRole("button", { name: "Новая заметка" }).click();
  await page.getByLabel("Заголовок заметки").fill("Не сохранена");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Не удалось сохранить. Попробуйте ещё раз")).toBeVisible();
  await expect(page.getByText("Сохранено", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/notes$/);
  expect(requests).toEqual([]);
});

test("guest task and note data never appear in or upload to an account", async ({ page }) => {
  const user = { id: 77, name: "Тест", email: "test@example.com", xp: 0, level: 1, avatarId: "orbit-indigo", aiTone: "calm" };
  let account = false;
  const writes: string[] = [];
  await page.addInitScript(() => localStorage.setItem("glowy_cookie_consent", "rejected"));
  await page.route(/^http:\/\/localhost:3001\/api\//, route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") writes.push(path);
    const body = path === "/api/auth/me" ? user : path === "/api/notes" || path === "/api/tasks" ? [] : path === "/api/user/progress" ? { xp: 0, level: 1 } : {};
    return route.fulfill({ status: account ? 200 : 401, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Открыть демо без регистрации", exact: true }).click();
  await page.goto("/notes");
  await page.getByRole("button", { name: "Новая заметка" }).click();
  await page.getByLabel("Заголовок заметки").fill("Только для гостя");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Выйти из аккаунта" }).last().click();
  account = true;
  // Synthetic authenticated scope, no real login or database writes.
  await page.evaluate(user => localStorage.setItem("auth-storage", JSON.stringify({ version: 4, state: {
    isGuest: false, isAuthenticated: true, isChecking: false, userId: user.id, name: user.name, email: user.email,
    avatarId: user.avatarId, aiTone: user.aiTone, token: null, currentEnergy: 100,
  } })), user);
  await page.goto("/notes");
  await expect(page.getByRole("button", { name: "Новая заметка" })).toBeVisible();
  await expect(page.getByText("Только для гостя", { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
  await page.evaluate(() => localStorage.setItem("auth-storage", JSON.stringify({ version: 4, state: {
    isGuest: true, isAuthenticated: true, isChecking: false, userId: null, name: "Демо", email: "demo",
    avatarId: "orbit-indigo", aiTone: "calm", token: "demo-token-restored", currentEnergy: 100,
  } })));
  account = false;
  await page.goto("/notes");
  await expect(page.getByRole("button", { name: /Только для гостя/ })).toBeVisible();
  expect(writes).toEqual([]);
});

test("a guest can confirm an AI draft without syncing the task", async ({ page }) => {
  const sent: unknown[] = [];
  await page.route(/^http:\/\/localhost:3001\/api\//, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ status: 401, json: {} });
    if (path !== "/api/ai/mind-hub/public") {
      sent.push(path);
      return route.fulfill({ status: 401, json: {} });
    }
    sent.push(request.postDataJSON());
    return route.fulfill({
      status: 200,
      json: {
        reply: "Подготовил черновик.",
        drafts: [{
          title: "Разобрать документы",
          date: "",
          priority: "⚡️ P2",
          category: "",
          completed: false,
          energyLevel: "med",
          subtasks: [{ title: "Собрать документы", completed: false, position: 0 }],
        }],
        limit: { limit: 5, remaining: 4, resetAt: null },
      },
    });
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Открыть демо без регистрации" }).click();
  await page.goto("/ai");
  await page.locator("textarea").fill("Помоги разобрать документы");
  await page.getByRole("button", { name: "Отправить мысли" }).click();
  await expect(page.getByText("Осталось 4 запроса")).toBeVisible();
  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await page.goto("/tasks");
  await page.reload();
  await expect(page.getByText("Разобрать документы", { exact: true }).first()).toBeVisible();
  expect(sent).toEqual([{ message: "Помоги разобрать документы", hubMode: "auto" }]);
});
