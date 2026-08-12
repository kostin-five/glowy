import assert from "node:assert/strict";
import test from "node:test";
import { logger } from "../lib/logger.js";

test("AI history errors do not log private request text", () => {
  const privateText = "мой личный текст";
  const originalError = console.error;
  let output = "";
  console.error = (value) => { output += String(value); };
  try {
    logger.error("ai.mind_hub.history_failed", {
      req: { requestId: "request-id", method: "POST", path: "/mind-hub", body: { message: privateText } },
      error: new Error(privateText),
      statusCode: 500,
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(output.includes(privateText), false);
  assert.equal(output.includes("request-id"), true);
});
