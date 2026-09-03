import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const createTask = (id: number, title: string, energyLevel: "low" | "med" | "high") => ({
  id,
  title,
  date: "2099-01-01",
  priority: "⚡️ P2",
  category: "Glowy",
  completed: false,
  completedOn: null,
  xpAwarded: false,
  energyLevel,
  estimatedMinutes: 30,
  actualMinutes: null,
  subtasks: [],
});

const prepareApp = async (page: Page) => {
  let tasks = [
    createTask(1, "Первый спокойный шаг", "high"),
    createTask(2, "Второй шаг плана", "med"),
    createTask(3, "Не добавлять сегодня", "low"),
  ];
  const updates: Array<{ id: number; date?: string }> = [];

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
      return fulfillJson(route, tasks);
    }
    const taskMatch = path.match(/^\/api\/tasks\/(\d+)$/);
    if (taskMatch && request.method() === "PUT") {
      const id = Number(taskMatch[1]);
      const patch = request.postDataJSON() as { date?: string };
      updates.push({ id, date: patch.date });
      tasks = tasks.map((task) => task.id === id ? { ...task, ...patch } : task);
      return fulfillJson(route, tasks.find((task) => task.id === id));
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
    return fulfillJson(route, {});
  });

  return updates;
};

test("reviews and confirms a bounded day plan without hidden updates", async ({ page }) => {
  const updates = await prepareApp(page);
  await page.goto("/dashboard");

  await expect(page.getByText("Следующий шаг", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Настроить план" }).click();
  await expect(page.getByRole("dialog", { name: "План на сегодня" })).toBeVisible();
  expect(updates).toHaveLength(0);

  const panel = page.getByTestId("modal-panel");
  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(panelBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  await expect.poll(async () => {
    const settledBox = await panel.boundingBox();
    return settledBox ? Math.ceil(settledBox.y + settledBox.height) : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(viewport!.height + 1);

  await page.getByRole("checkbox", { name: /Не добавлять сегодня/ }).uncheck();
  expect(updates).toHaveLength(0);
  await page.getByRole("button", { name: "Добавить в план" }).click();

  await expect(page.getByText(/План на сегодня готов/)).toBeVisible();
  await expect.poll(() => updates).toHaveLength(2);
  expect(updates.map(({ id }) => id).sort()).toEqual([1, 2]);
  expect(updates.every((update) => update.date === today())).toBe(true);
  await expect(page.getByText("Не добавлять сегодня")).toBeVisible();
});
