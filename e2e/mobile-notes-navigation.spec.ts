import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const initialNote = {
  id: 7,
  title: "План запуска",
  content: "Проверить мобильный сценарий",
  archived: false,
  createdAt: "2026-09-03T08:00:00.000Z",
  updatedAt: "2026-09-03T09:00:00.000Z",
  taskLinks: [],
};

const prepareApp = async (page: Page) => {
  let note = { ...initialNote };
  let createdNotes = 0;

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
        currentEnergy: 80,
      },
      version: 4,
    }));
  });

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");

    if (path === "/api/auth/me") return fulfillJson(route, {
      id: 1,
      name: "Тест",
      email: "test@example.com",
      xp: 0,
      level: 1,
      avatarId: "orbit-indigo",
      aiTone: "calm",
    });
    if (path === "/api/tasks") return fulfillJson(route, []);
    if (path === "/api/user/progress") return fulfillJson(route, { xp: 0, level: 1 });
    if (path === "/api/notes" && request.method() === "GET") {
      return fulfillJson(route, [note]);
    }
    if (path === "/api/notes" && request.method() === "POST") {
      createdNotes += 1;
      const body = request.postDataJSON() as { title: string; content: string };
      note = { ...initialNote, ...body, id: 8 };
      return fulfillJson(route, note);
    }
    if (path === "/api/notes/7" && request.method() === "GET") {
      return fulfillJson(route, note);
    }
    if (path === "/api/notes/7" && request.method() === "PUT") {
      note = { ...note, ...(request.postDataJSON() as Partial<typeof note>) };
      return fulfillJson(route, note);
    }

    return fulfillJson(route, {});
  });

  return { getCreatedNotes: () => createdNotes };
};

test("uses one notes surface and saves before returning on compact widths", async ({ page }) => {
  const server = await prepareApp(page);

  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/notes");

    await expect(page.getByRole("heading", { name: "Умные заметки" })).toBeVisible();
    await expect(page.getByRole("button", { name: /План запуска/ })).toBeVisible();
    await expect(page.getByLabel("Заголовок заметки")).not.toBeVisible();

    await page.getByRole("button", { name: /План запуска/ }).click();
    await expect(page).toHaveURL(/\/notes\/7$/);
    await expect(page.getByRole("button", { name: "Назад к заметкам" })).toBeVisible();
    await expect(page.getByPlaceholder("Поиск по заметкам")).not.toBeVisible();

    await page.getByLabel("Заголовок заметки").fill(`План запуска ${width}`);
    await page.getByRole("button", { name: "Назад к заметкам" }).click();
    await expect(page).toHaveURL(/\/notes$/);
    await expect(page.getByRole("button", { name: new RegExp(`План запуска ${width}`) })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole("button", { name: "Новая заметка" }).click();
    await page.getByRole("button", { name: "Назад к заметкам" }).click();
    expect(server.getCreatedNotes()).toBe(0);
  }
});

test("keeps the modern notes workspace together on desktop", async ({ page }) => {
  await prepareApp(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/notes");

  await expect(page.getByPlaceholder("Поиск по заметкам")).toBeVisible();
  await expect(page.getByLabel("Заголовок заметки")).toBeVisible();
  await expect(page.getByLabel("Контекст заметки")).toBeVisible();
  await expect(page.getByRole("button", { name: "Назад к заметкам" })).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
