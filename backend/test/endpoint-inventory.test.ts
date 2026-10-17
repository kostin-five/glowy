import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROUTE_MOUNTS = {
  "ai.routes.js": "/api/ai",
  "analytics.routes.js": "/api/analytics",
  "auth.routes.js": "/api/auth",
  "chat.routes.js": "/api/chat",
  "notes.routes.js": "/api/notes",
  "payment.routes.js": "/api/payments",
  "progress.routes.js": "/api/progress",
  "subtask.routes.js": "/api/subtasks",
  "task.routes.js": "/api/tasks",
  "telegram.routes.js": "/api/telegram",
  "user.routes.js": "/api/user",
};

const repositoryRoot = new URL(
  import.meta.url.includes("/dist/") ? "../../../" : "../../",
  import.meta.url
);

const normalizePath = (base: string, path: string) =>
  path === "/" ? base : `${base}${path}`;

const readImplementedOperations = async () => {
  const operations = ["GET /api/health"];

  for (const [file, base] of Object.entries(ROUTE_MOUNTS)) {
    const source = await readFile(new URL(`../routes/${file}`, import.meta.url), "utf8");
    const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/g;

    for (const match of source.matchAll(routePattern)) {
      operations.push(`${match[1]!.toUpperCase()} ${normalizePath(base, match[2]!)}`);
    }
  }

  return operations.sort();
};

const readDocumentedOperations = async () => {
  const inventory = await readFile(
    new URL("docs/api-endpoints.md", repositoryRoot),
    "utf8"
  );
  const operationPattern = /\| `(GET|POST|PUT|PATCH|DELETE) (\/api\/[^`]+)`/g;

  return [...inventory.matchAll(operationPattern)]
    .map((match) => `${match[1]} ${match[2]}`)
    .sort();
};

test("the documented 52-operation endpoint inventory matches mounted routes", async () => {
  const implemented = await readImplementedOperations();
  const documented = await readDocumentedOperations();

  assert.equal(implemented.length, 52);
  assert.deepEqual(documented, implemented);
});
