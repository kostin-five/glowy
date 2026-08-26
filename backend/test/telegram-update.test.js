import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramUpdateService } from "../services/telegram/telegram-update.service.js";

const now = new Date("2026-08-26T12:00:00.000Z");

test("claims one eligible update with a conditional state transition", async () => {
  const candidate = {
    updateId: "10",
    status: "PENDING",
    attempts: 0,
    updatedAt: new Date("2026-08-26T11:59:00.000Z"),
    payload: { update_id: 10 },
  };
  const service = createTelegramUpdateService({
    db: {
      $transaction: async (work) => work({
        telegramWebhookUpdate: {
          findFirst: async () => candidate,
          updateMany: async () => ({ count: 1 }),
        },
      }),
    },
    now: () => now,
  });
  const claimed = await service.claimNext();
  assert.equal(claimed.status, "PROCESSING");
  assert.equal(claimed.attempts, 1);
});

test("retries transient failures and clears terminal payloads", async () => {
  const writes = [];
  const service = createTelegramUpdateService({
    db: {
      telegramWebhookUpdate: {
        update: async ({ data }) => { writes.push(data); return {}; },
      },
    },
    now: () => now,
  });
  await service.fail({ updateId: "10", attempts: 1 }, "TELEGRAM_NETWORK_ERROR", true);
  await service.fail({ updateId: "11", attempts: 3 }, "TELEGRAM_NETWORK_ERROR", true);

  assert.equal(writes[0].status, "PENDING");
  assert.equal(writes[0].payload, undefined);
  assert.equal(writes[1].status, "FAILED");
  assert.equal(writes[1].payload, null);
});

test("cleanup expires stale payloads and pending drafts", async () => {
  const calls = [];
  const service = createTelegramUpdateService({
    db: {
      telegramWebhookUpdate: {
        updateMany: async (args) => { calls.push(["updates", args]); },
        deleteMany: async (args) => { calls.push(["delete", args]); },
      },
      telegramTaskDraft: {
        updateMany: async (args) => { calls.push(["drafts", args]); },
      },
    },
    now: () => now,
  });
  await service.cleanup();
  assert.deepEqual(calls.map(([name]) => name), ["updates", "drafts", "delete"]);
  assert.equal(calls[0][1].data.payload, null);
  assert.equal(calls[1][1].data.status, "EXPIRED");
});

