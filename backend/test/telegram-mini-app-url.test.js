import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramMiniAppUrlService } from "../services/telegram/telegram-mini-app-url.service.js";

test("builds only HTTPS allowlisted Mini App targets", () => {
  const urls = createTelegramMiniAppUrlService({
    baseUrl: "https://dev.glowy-ai.ru/telegram",
  });
  assert.equal(urls.configured, true);
  assert.equal(urls.build("tasks"), "https://dev.glowy-ai.ru/telegram?target=tasks");
  assert.equal(urls.build("https://evil.test"), "https://dev.glowy-ai.ru/telegram?target=home");
  assert.equal(createTelegramMiniAppUrlService({ baseUrl: "http://localhost" }).build(), null);
});
