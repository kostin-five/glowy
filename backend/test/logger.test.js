import assert from "node:assert/strict";
import test from "node:test";
import { logger } from "../lib/logger.js";

test("logger keeps sensitive request and error details out of error records", () => {
  const originalConsoleError = console.error;
  let record = "";
  console.error = (line) => {
    record = line;
  };

  try {
    logger.error("test.redaction", {
      req: {
        requestId: "request-123",
        method: "POST",
        path: "/api/tasks",
        body: { title: "Private task", password: "secret" },
        headers: { authorization: "Bearer private-token" },
      },
      error: new Error("private failure message"),
      statusCode: 500,
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(JSON.parse(record), {
    timestamp: JSON.parse(record).timestamp,
    level: "error",
    event: "test.redaction",
    requestId: "request-123",
    method: "POST",
    path: "/api/tasks",
    statusCode: 500,
    errorName: "Error",
  });
  assert.doesNotMatch(record, /Private task|secret|private-token|private failure/i);
});

test("logger recursively allowlists operational fields from info context", () => {
  const originalConsoleLog = console.log;
  let record = "";
  console.log = (line) => {
    record = line;
  };

  try {
    logger.info("test.allowlist", {
      provider: "deepseek",
      durationMs: 120,
      metrics: {
        totalTokens: 25,
        password: "SENTINEL_PASSWORD",
        token: "SENTINEL_TOKEN",
        email: "sentinel@example.test",
        initData: "SENTINEL_INIT_DATA",
        taskTitle: "SENTINEL_TASK_TEXT",
        noteContent: "SENTINEL_NOTE_TEXT",
        aiText: "SENTINEL_AI_TEXT",
      },
    });
  } finally {
    console.log = originalConsoleLog;
  }

  assert.deepEqual(JSON.parse(record), {
    timestamp: JSON.parse(record).timestamp,
    level: "info",
    event: "test.allowlist",
    provider: "deepseek",
    durationMs: 120,
    metrics: { totalTokens: 25 },
  });
  assert.doesNotMatch(record, /SENTINEL_|example\.test/);
});
