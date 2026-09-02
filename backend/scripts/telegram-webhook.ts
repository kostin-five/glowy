import "dotenv/config";
import { createTelegramApiClient } from "../services/telegram/telegram-api.client.js";
import { TELEGRAM_BOT_COMMANDS } from "../services/telegram/telegram-command-catalog.js";
import { isUnknownRecord } from "../types/boundaries.js";

const command = process.argv[2] || "";
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

const fail = (message: string): void => {
  console.error(message);
  process.exitCode = 1;
};

const validateConfig = () => {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  if (command === "configure") {
    if (!webhookUrl || !webhookUrl.startsWith("https://")) {
      throw new Error("TELEGRAM_WEBHOOK_URL must be an HTTPS URL");
    }
    if (!/^[A-Za-z0-9_-]{16,256}$/.test(webhookSecret || "")) {
      throw new Error("TELEGRAM_WEBHOOK_SECRET must use 16-256 safe characters");
    }
    try {
      const url = new URL(miniAppUrl || "");
      if (url.protocol !== "https:") throw new Error();
    } catch {
      throw new Error("TELEGRAM_MINI_APP_URL must be an HTTPS URL");
    }
  }
};

const run = async () => {
  if (!["configure", "status", "delete"].includes(command)) {
    throw new Error("Use: configure, status, or delete");
  }
  validateConfig();
  const api = createTelegramApiClient({ token: token! });

  if (command === "configure") {
    await api.setWebhook({
      url: webhookUrl!,
      secret_token: webhookSecret!,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
    await api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "Открыть Glowy",
        web_app: { url: miniAppUrl! },
      },
    });
    await api.setMyCommands({
      commands: TELEGRAM_BOT_COMMANDS,
    });
    console.log("Telegram webhook, Mini App menu and commands configured. Secrets were not printed.");
    return;
  }

  if (command === "delete") {
    await api.setWebhook({ url: "", drop_pending_updates: false });
    console.log("Telegram webhook removed. Pending updates were preserved.");
    return;
  }

  const info = await api.getWebhookInfo();
  const infoRecord = isUnknownRecord(info) ? info : {};
  console.log(
    JSON.stringify({
      configured: Boolean(infoRecord.url),
      pendingUpdateCount: Number(infoRecord.pending_update_count || 0),
      hasCustomCertificate: Boolean(infoRecord.has_custom_certificate),
      lastErrorAt: typeof infoRecord.last_error_date === "number"
        ? new Date(infoRecord.last_error_date * 1000).toISOString()
        : null,
    })
  );
};

run().catch((error) => {
  fail(error instanceof Error ? error.message : "Telegram webhook command failed");
});
