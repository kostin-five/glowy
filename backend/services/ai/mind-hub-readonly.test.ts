import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mind hub AI flow contains no task persistence calls", async () => {
  const [routeSource, serviceSource] = await Promise.all([
    readFile(new URL("../../routes/ai.routes.js", import.meta.url), "utf8"),
    readFile(new URL("./mind-hub.service.js", import.meta.url), "utf8"),
  ]);
  const mindHubRoute = routeSource.slice(routeSource.indexOf('router.post("/mind-hub"'));

  assert.doesNotMatch(mindHubRoute, /prisma\.task\.(?:create|update|delete)/);
  assert.doesNotMatch(serviceSource, /prisma\.task\.(?:create|update|delete)/);
  assert.doesNotMatch(serviceSource, /createMindHubTasks/);
});
