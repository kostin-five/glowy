import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import test from "node:test";
import { createTelegramMiniAppSessionService } from "../services/telegram/telegram-mini-app-session.service.js";

const user = {
  id: 42,
  name: "Тест",
  email: "test@example.com",
  password: bcrypt.hashSync("password1", 4),
  xp: 0,
  level: 1,
  avatarId: null,
  aiTone: "calm",
};

const createService = ({ telegramConnection, userConnection }) => {
  const tx = {
    telegramConnection: {
      findUnique: async ({ where }) =>
        where.telegramUserId ? telegramConnection : userConnection,
      create: async () => { throw new Error("connection must not be created on conflict"); },
    },
  };
  return createTelegramMiniAppSessionService({
    db: {
      user: { findUnique: async () => user },
      $transaction: async (run) => run(tx),
    },
    launchAuth: { validate: () => ({ telegramUserId: "1001" }) },
  });
};

test("login rejects a Telegram identity linked to another Glowy account", async () => {
  const service = createService({
    telegramConnection: { id: 5, userId: 9 },
    userConnection: null,
  });
  await assert.rejects(
    service.login({ initData: "signed", email: user.email, password: "password1" }),
    (error) => error.code === "TELEGRAM_LINK_CONFLICT" && error.status === 409
  );
});

test("login rejects a Glowy account linked to another Telegram identity", async () => {
  const service = createService({
    telegramConnection: null,
    userConnection: { id: 6, telegramUserId: "2002" },
  });
  await assert.rejects(
    service.login({ initData: "signed", email: user.email, password: "password1" }),
    (error) => error.code === "TELEGRAM_LINK_CONFLICT"
  );
});
