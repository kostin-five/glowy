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
      $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
        telegramWebhookUpdate: {
          findFirst: async () => candidate,
          updateMany: async () => ({ count: 1 }),
        },
      }),
    },
    now: () => now,
  } as never);
  const claimed = await service.claimNext();
  assert.ok(claimed);
  assert.equal(claimed.status, "PROCESSING");
  assert.equal(claimed.attempts, 1);
});

test("reclaims stale processing after a worker restart", async () => {
  let receivedWhere: { OR: Array<{ status: string; updatedAt?: { lte: Date } }> } | undefined;
  const candidate = {
    updateId: "12",
    status: "PROCESSING",
    attempts: 1,
    updatedAt: new Date("2026-08-26T11:50:00.000Z"),
    payload: { update_id: 12 },
  };
  const service = createTelegramUpdateService({
    db: {
      $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
        telegramWebhookUpdate: {
          findFirst: async ({ where }: { where: typeof receivedWhere }) => { receivedWhere = where; return candidate; },
          updateMany: async () => ({ count: 1 }),
        },
      }),
    },
    now: () => now,
  } as never);

  const claimed = await service.claimNext();

  assert.ok(claimed);
  assert.equal(claimed.status, "PROCESSING");
  assert.equal(claimed.attempts, 2);
  assert.ok(receivedWhere);
  assert.equal(receivedWhere.OR[1]!.status, "PROCESSING");
  assert.equal(receivedWhere.OR[1]!.updatedAt!.lte.toISOString(), "2026-08-26T11:55:00.000Z");
});

test("retries transient failures and clears terminal payloads", async () => {
  const writes: Array<Record<string, unknown>> = [];
  const service = createTelegramUpdateService({
    db: {
      telegramWebhookUpdate: {
        update: async ({ data }: { data: Record<string, unknown> }) => { writes.push(data); return {}; },
      },
    },
    now: () => now,
  } as never);
  await service.fail({ updateId: "10", attempts: 1 }, "TELEGRAM_NETWORK_ERROR", true);
  await service.fail({ updateId: "11", attempts: 3 }, "TELEGRAM_NETWORK_ERROR", true);

  assert.equal(writes[0]!.status, "PENDING");
  assert.equal(writes[0]!.payload, undefined);
  assert.equal(writes[1]!.status, "FAILED");
  assert.equal(writes[1]!.payload, null);
});

test("cleanup expires stale payloads and pending drafts", async () => {
  const calls: Array<[string, { data: Record<string, unknown> }]> = [];
  const service = createTelegramUpdateService({
    db: {
      telegramWebhookUpdate: {
        updateMany: async (args: { data: Record<string, unknown> }) => { calls.push(["updates", args]); },
        deleteMany: async (args: { data: Record<string, unknown> }) => { calls.push(["delete", args]); },
      },
      telegramTaskDraft: {
        updateMany: async (args: { data: Record<string, unknown> }) => { calls.push(["drafts", args]); },
      },
    },
    now: () => now,
  } as never);
  await service.cleanup();
  assert.deepEqual(calls.map(([name]) => name), ["updates", "drafts", "delete"]);
  assert.equal(calls[0]![1].data.payload, null);
  assert.equal(calls[1]![1].data.status, "EXPIRED");
});
