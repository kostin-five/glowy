import assert from "node:assert/strict";
import test from "node:test";
import {
  callbackUpdate,
  createApiRecorder,
  createWorkerFixture,
  linkedConnection,
  messageUpdate,
} from "./telegram-test-helpers.js";

test("energy shows the linked user's current value", async () => {
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      user: { findUnique: async ({ where }) => ({ id: where.id, currentEnergy: 60 }) },
    },
  });
  await worker.processUpdate(messageUpdate({ text: "/energy" }), "10");

  assert.match(recorder.calls[0][1].text, /60 из 100/);
  assert.equal(recorder.calls[0][1].reply_markup.inline_keyboard.length, 4);
  assert.equal(
    recorder.calls[0][1].reply_markup.inline_keyboard.at(-1)[0].web_app.url,
    "https://dev.glowy-ai.ru/telegram?target=home"
  );
});

test("energy callback updates only the linked owner", async () => {
  let updateArgs;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => linkedConnection },
      user: { update: async (args) => { updateArgs = args; return {}; } },
    },
  });
  await worker.processUpdate(callbackUpdate("tg:energy:80"), "11");

  assert.deepEqual(updateArgs, { where: { id: 42 }, data: { currentEnergy: 80 } });
  assert.equal(recorder.calls[0][0], "answerCallbackQuery");
});

test("foreign unlinked callback cannot update energy", async () => {
  let touched = false;
  const recorder = createApiRecorder();
  const worker = createWorkerFixture({
    api: recorder.api,
    db: {
      telegramConnection: { findUnique: async () => null },
      user: { update: async () => { touched = true; } },
    },
  });
  await worker.processUpdate(callbackUpdate("tg:energy:100"), "11");
  assert.equal(touched, false);
});
