import { expect, test, type Page, type Route } from "@playwright/test";

const fulfillJson = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const localDate = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const prepareApp = async (page: Page) => {
  let aiRequests = 0;
  await page.addInitScript(() => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    localStorage.setItem("auth-storage", JSON.stringify({ state: { userId: 1, isAuthenticated: true, isGuest: false, isChecking: false, name: "Тест", email: "test@example.com", avatarId: "orbit-indigo", aiTone: "calm", token: null, currentEnergy: 70 }, version: 4 }));
    localStorage.setItem("glowy-settings", JSON.stringify({ state: { shownOnboardingHints: ["taskCreation"], taskFormPreferencesByAccount: { "user:1": { mode: "full", fields: { energy: true, priority: true } } } }, version: 0 }));
  });
  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/\/$/, "");
    if (path === "/api/auth/me") return fulfillJson(route, { id: 1, name: "Тест", email: "test@example.com", xp: 0, level: 1, avatarId: "orbit-indigo", aiTone: "calm" });
    if (path === "/api/tasks") return fulfillJson(route, [
      { id: 1, title: "Просроченный отчёт", date: localDate(-1), priority: "🔥 P1", category: "Работа", completed: false, completedOn: null, xpAwarded: false, energyLevel: "high", estimatedMinutes: 60, actualMinutes: null, subtasks: [] },
      { id: 2, title: "Сегодняшняя прогулка", date: localDate(0), priority: "💤 P3", category: "Личное", completed: false, completedOn: null, xpAwarded: false, energyLevel: "low", estimatedMinutes: 20, actualMinutes: null, subtasks: [] },
    ]);
    if (path === "/api/ai/subtask-draft") {
      aiRequests += 1;
      return fulfillJson(route, { subtasks: [{ title: "Собрать требования" }, { title: "Проверить сценарий" }], limit: { limit: 70, remaining: 69, resetAt: null } });
    }
    if (path === "/api/user/progress") return fulfillJson(route, { xp: 0, level: 1 });
    return fulfillJson(route, {});
  });
  return () => aiRequests;
};

test("filters tasks and keeps AI steps as a confirmable draft", async ({ page }) => {
  const aiRequestCount = await prepareApp(page);
  await page.goto("/tasks");

  await page.getByRole("button", { name: "Фильтры" }).click();
  await page.getByLabel("Энергия").selectOption("low");
  await expect(page.getByText("Сегодняшняя прогулка")).toBeVisible();
  await expect(page.getByText("Просроченный отчёт")).toHaveCount(0);
  await page.getByRole("button", { name: "Сбросить" }).click();
  await expect(page.getByText("Просроченный отчёт")).toBeVisible();

  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await page.getByLabel("Название задачи").fill("Подготовить запуск");
  await page.getByRole("button", { name: "AI шаги" }).click();
  await expect(page.locator('input[value="Собрать требования"]')).toBeVisible();
  expect(aiRequestCount()).toBe(1);
  await expect(page.getByText("Glowy ничего не сохранит")).toBeVisible();
  await page.getByRole("button", { name: "Добавить шаги" }).click();
  await expect(page.getByText("Собрать требования", { exact: true })).toBeVisible();
});
