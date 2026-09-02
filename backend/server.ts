import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { createTelegramRouter } from "./routes/telegram.routes.js";
import { createTelegramWorker } from "./services/telegram/telegram-worker.service.js";

const port = process.env.PORT || 3001;
const telegramWorker = createTelegramWorker();
const app = createApp({
  telegramRouter: createTelegramRouter({
    notifyWorker: () => telegramWorker.notify(),
  }),
});

const server = app.listen(port, () => {
  logger.info("server.started", { port });
  if (process.env.TELEGRAM_WORKER_ENABLED === "true") {
    telegramWorker.start();
    logger.info("telegram.worker.started");
  }
});

const shutdown = () => {
  telegramWorker.stop();
  server.close();
};

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
