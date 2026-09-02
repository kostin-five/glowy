import assert from "node:assert/strict";
import test from "node:test";
import {
  createTelegramLinkService,
  TelegramLinkError,
} from "../services/telegram/telegram-link.service.js";

const fixedNow = new Date("2026-08-26T20:00:00.000Z");

test("stores only an HMAC and returns a ten-minute one-use code", async () => {
  let stored: { codeHash: string } | undefined;
  const tx = {
    telegramLinkCode: {
      deleteMany: async () => {},
      create: async ({ data }: { data: { codeHash: string } }) => { stored = data; },
    },
  };
  const service = createTelegramLinkService({
    db: {
      telegramConnection: { findUnique: async () => null },
      $transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    },
    linkSecret: "link-test-secret",
    botUsername: "glowy_test_bot",
    now: () => fixedNow,
    randomBytes: () => Buffer.alloc(9, 7),
  } as never);

  const result = await service.createCode(42);
  assert.equal(result.code.length, 12);
  assert.equal(result.expiresAt.toISOString(), "2026-08-26T20:10:00.000Z");
  assert.match(result.deepLink, /^https:\/\/t\.me\/glowy_test_bot\?start=/);
  assert.ok(stored);
  assert.notEqual(stored.codeHash, result.code);
  assert.equal(stored.codeHash.length, 64);
});

test("consumes a valid code atomically for one Telegram account", async () => {
  let consumed = 0;
  let created: Record<string, unknown> | undefined;
  const service = createTelegramLinkService({
    db: {
      $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
        telegramLinkCode: {
          findUnique: async () => ({
            id: 3,
            userId: 42,
            usedAt: null,
            expiresAt: new Date("2026-08-26T20:05:00.000Z"),
          }),
          updateMany: async ({ where }: { where: { id: number } }) => {
            if (where.id === 3) consumed += 1;
            return { count: 1 };
          },
        },
        telegramConnection: {
          findUnique: async () => null,
          create: async ({ data }: { data: Record<string, unknown> }) => { created = data; return { id: 9, ...data }; },
        },
      }),
    },
    linkSecret: "link-test-secret",
    botUsername: "glowy_test_bot",
    now: () => fixedNow,
  } as never);

  const connection = await service.consumeCode({
    code: "Abcd1234_-xy",
    telegramUserId: "123456789",
    chatId: "123456789",
  });
  assert.equal(consumed, 1);
  assert.deepEqual(created, {
    userId: 42,
    telegramUserId: "123456789",
    chatId: "123456789",
  });
  assert.equal(connection.id, 9);
});

test("rejects expired and conflicting links", async () => {
  const expired = createTelegramLinkService({
    db: {
      $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
        telegramLinkCode: {
          findUnique: async () => ({
            id: 3,
            userId: 42,
            usedAt: null,
            expiresAt: new Date("2026-08-26T19:59:59.000Z"),
          }),
        },
      }),
    },
    linkSecret: "link-test-secret",
    botUsername: "glowy_test_bot",
    now: () => fixedNow,
  } as never);
  await assert.rejects(
    expired.consumeCode({ code: "Abcd1234_-xy", telegramUserId: "1", chatId: "1" }),
    (error) => error instanceof TelegramLinkError && error.code === "TELEGRAM_LINK_INVALID"
  );

  const conflict = createTelegramLinkService({
    db: {
      $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
        telegramLinkCode: {
          findUnique: async () => ({
            id: 3,
            userId: 42,
            usedAt: null,
            expiresAt: new Date("2026-08-26T20:05:00.000Z"),
          }),
        },
        telegramConnection: { findUnique: async () => ({ id: 8 }) },
      }),
    },
    linkSecret: "link-test-secret",
    botUsername: "glowy_test_bot",
    now: () => fixedNow,
  } as never);
  await assert.rejects(
    conflict.consumeCode({ code: "Abcd1234_-xy", telegramUserId: "1", chatId: "1" }),
    (error: unknown) => error instanceof TelegramLinkError && error.code === "TELEGRAM_LINK_CONFLICT"
  );
});
