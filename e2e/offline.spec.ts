import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test";

type MockTask = {
  id: number;
  title: string;
  date: string;
  priority: "🔥 P1" | "⚡️ P2" | "💤 P3";
  category: string;
  completed: boolean;
  completedOn: string | null;
  xpAwarded: boolean;
  energyLevel: "low" | "med" | "high";
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  subtasks: Array<{
    id: number;
    taskId: number;
    title: string;
    completed: boolean;
    position: number;
  }>;
};

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const setAuthenticatedSession = async (page: Page, userId: number) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => localStorage.getItem("e2e-network-online") !== "false",
    });
  });
  await page.addInitScript((id) => {
    localStorage.setItem("glowy_cookie_consent", "rejected");
    if (localStorage.getItem("auth-storage")) return;
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          userId: id,
          isAuthenticated: true,
          isGuest: false,
          isChecking: false,
          name: `Тест ${id}`,
          email: `offline-${id}@example.com`,
          avatarId: "orbit-indigo",
          aiTone: "calm",
          token: null,
          currentEnergy: 100,
        },
        version: 4,
      })
    );
  }, userId);
};

const mockAuthenticatedApi = async (page: Page) => {
  const tasksByUser = new Map<number, MockTask[]>();
  let activeUserId = 1;
  let apiOnline = true;
  let rejectTaskWrites = false;
  let nextTaskId = 100;
  let nextSubTaskId = 1000;

  await page.route(/^http:\/\/localhost:3001\/api\//, async (route) => {
    if (!apiOnline) {
      return route.abort("internetdisconnected");
    }

    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, "");

    if (path === "/api/auth/me") {
      return fulfillJson(route, {
        id: activeUserId,
        name: `Тест ${activeUserId}`,
        email: `offline-${activeUserId}@example.com`,
        xp: 0,
        level: 1,
        avatarId: "orbit-indigo",
        aiTone: "calm",
      });
    }

    if (path === "/api/tasks" && request.method() === "GET") {
      return fulfillJson(route, tasksByUser.get(activeUserId) ?? []);
    }

    if (path === "/api/tasks" && request.method() === "POST") {
      if (rejectTaskWrites) {
        return fulfillJson(route, { error: "Изменение отклонено" }, 400);
      }
      const payload = request.postDataJSON() as Omit<
        MockTask,
        "id" | "completedOn" | "xpAwarded" | "actualMinutes" | "subtasks"
      > & {
        subtasks?: Array<{
          title: string;
          completed: boolean;
          position: number;
        }>;
      };
      const taskId = nextTaskId++;
      const created: MockTask = {
        ...payload,
        id: taskId,
        completed: payload.completed ?? false,
        completedOn: null,
        xpAwarded: false,
        estimatedMinutes: payload.estimatedMinutes ?? null,
        actualMinutes: null,
        subtasks: (payload.subtasks ?? []).map((subtask) => ({
          ...subtask,
          id: nextSubTaskId++,
          taskId,
        })),
      };
      tasksByUser.set(activeUserId, [
        ...(tasksByUser.get(activeUserId) ?? []),
        created,
      ]);
      return fulfillJson(route, created, 201);
    }

    if (path === "/api/user/progress") {
      return fulfillJson(route, { xp: 0, level: 1 });
    }

    if (path === "/api/progress") {
      return fulfillJson(route, {
        taskStreak: {
          current: 0,
          best: 0,
          activeDates: [],
          missedDateEligibleForRescue: null,
        },
        rescues: { remaining: 3, used: 0 },
        habits: [],
        achievements: [],
      });
    }

    return fulfillJson(route, {});
  });

  return {
    tasksByUser,
    useUser: (userId: number) => {
      activeUserId = userId;
    },
    setOnline: (online: boolean) => {
      apiOnline = online;
    },
    rejectTaskWrites: (reject: boolean) => {
      rejectTaskWrites = reject;
    },
  };
};

const setAppOnline = async (
  page: Page,
  context: BrowserContext,
  server: Awaited<ReturnType<typeof mockAuthenticatedApi>>,
  online: boolean
) => {
  server.setOnline(online);
  if (online) {
    await context.setOffline(false);
  }
  await page.evaluate(async (nextOnline) => {
    localStorage.setItem("e2e-network-online", String(nextOnline));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    window.dispatchEvent(new Event(nextOnline ? "online" : "offline"));
  }, online);
  if (!online) {
    await context.setOffline(true);
  }
};

const waitForAppShell = async (page: Page) => {
  await expect
    .poll(
      () =>
        page
          .evaluate(() =>
            "serviceWorker" in navigator
              ? Boolean(navigator.serviceWorker.controller)
              : false
          )
          .catch(() => false),
      {
        message: "Service worker должен взять страницу под контроль",
        timeout: 15_000,
      }
    )
    .toBe(true);
};

const readOfflineState = (page: Page) =>
  page.evaluate(
    ({ databaseName, snapshotStore, operationStore }) =>
      new Promise<{
        snapshots: Array<{ ownerKey: string; titles: string[]; revision: string }>;
        operations: Array<{ ownerKey: string; kind: string }>;
      }>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            [snapshotStore, operationStore],
            "readonly"
          );
          const snapshotRequest = transaction.objectStore(snapshotStore).getAll();
          const operationRequest = transaction.objectStore(operationStore).getAll();
          transaction.onerror = () => reject(transaction.error);
          transaction.oncomplete = () => {
            const snapshots = snapshotRequest.result.map((snapshot) => ({
              ownerKey: snapshot.ownerKey,
              titles: snapshot.tasks.map((task: MockTask) => task.title),
              revision: snapshot.revision,
            }));
            const operations = operationRequest.result.map((operation) => ({
              ownerKey: operation.ownerKey,
              kind: operation.kind,
            }));
            database.close();
            resolve({ snapshots, operations });
          };
        };
      }),
    {
      databaseName: "glowy-offline",
      snapshotStore: "task-snapshots",
      operationStore: "task-operations",
    }
  );

test("opens My progress after the connection is lost", async ({
  context,
  page,
}) => {
  await setAuthenticatedSession(page, 1);
  const server = await mockAuthenticatedApi(page);

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
  await waitForAppShell(page);
  await setAppOnline(page, context, server, false);

  await page.goto("/progress");

  await expect(page.getByRole("heading", { name: "Мой прогресс" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Не удалось загрузить этот экран" })
  ).toHaveCount(0);
});

test("keeps an offline task through reload and syncs it after reconnect", async ({
  context,
  page,
}) => {
  const taskTitle = "Задача из метро";
  await setAuthenticatedSession(page, 1);
  const server = await mockAuthenticatedApi(page);

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
  await waitForAppShell(page);

  await setAppOnline(page, context, server, false);
  await expect(page.getByText("Нет сети.")).toBeVisible();
  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await page.getByPlaceholder("Введите задачу").fill(taskTitle);
  await page
    .getByPlaceholder("Что нужно сделать?")
    .fill("Открыть сохранённые материалы");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();
  await expect(page.getByPlaceholder("Введите задачу")).toHaveCount(0);
  expect(await readOfflineState(page)).toMatchObject({
    snapshots: [
      {
        ownerKey: "user:1",
        titles: [taskTitle],
        revision: expect.any(String),
      },
    ],
    operations: [{ ownerKey: "user:1", kind: "task.create" }],
  });

  await page.reload();
  expect(await readOfflineState(page)).toMatchObject({
    snapshots: [{ ownerKey: "user:1", titles: [taskTitle] }],
  });
  await expect(page.getByText(taskTitle)).toBeVisible();
  expect(server.tasksByUser.get(1) ?? []).toHaveLength(0);

  await setAppOnline(page, context, server, true);
  await expect.poll(() => server.tasksByUser.get(1)?.length ?? 0).toBe(1);
  await expect(page.getByText("Нет сети.")).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(taskTitle)).toBeVisible();
});

test("does not show one account's cached tasks in another account", async ({
  context,
  page,
}) => {
  const taskTitle = "Личная задача первого аккаунта";
  await setAuthenticatedSession(page, 1);
  const server = await mockAuthenticatedApi(page);

  await page.goto("/tasks");
  await waitForAppShell(page);
  await setAppOnline(page, context, server, false);
  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await page.getByPlaceholder("Введите задачу").fill(taskTitle);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();

  server.useUser(2);
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("auth-storage") ?? "{}");
    stored.state = {
      ...stored.state,
      userId: 2,
      name: "Тест 2",
      email: "offline-2@example.com",
    };
    localStorage.setItem("auth-storage", JSON.stringify(stored));
  });
  await page.reload();

  await expect(page.getByRole("heading", { name: "Твои задачи" })).toBeVisible();
  await expect(page.getByText(taskTitle)).toHaveCount(0);
});

test("keeps a rejected offline change queued and offers a retry", async ({
  context,
  page,
}) => {
  const taskTitle = "Изменение ожидает повторения";
  await setAuthenticatedSession(page, 1);
  const server = await mockAuthenticatedApi(page);

  await page.goto("/tasks");
  await waitForAppShell(page);
  await setAppOnline(page, context, server, false);
  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await page.getByPlaceholder("Введите задачу").fill(taskTitle);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();

  server.rejectTaskWrites(true);
  await setAppOnline(page, context, server, true);
  await expect(
    page.getByText("Не удалось применить одно из изменений. Попробуй ещё раз.")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
  expect(server.tasksByUser.get(1) ?? []).toHaveLength(0);

  server.rejectTaskWrites(false);
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect.poll(() => server.tasksByUser.get(1)?.length ?? 0).toBe(1);
  await expect(page.getByRole("button", { name: "Повторить" })).toHaveCount(0);
});
