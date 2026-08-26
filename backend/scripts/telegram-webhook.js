import "dotenv/config";
import { createTelegramApiClient } from "../services/telegram/telegram-api.client.js";

const command = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

const fail = (message) => {
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
  }
};

const run = async () => {
  if (!["configure", "status", "delete"].includes(command)) {
    throw new Error("Use: configure, status, or delete");
  }
  validateConfig();
  const api = createTelegramApiClient({ token });

  if (command === "configure") {
    await api.setWebhook({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
    console.log("Telegram webhook configured. Secrets were not printed.");
    return;
  }

  if (command === "delete") {
    await api.setWebhook({ url: "", drop_pending_updates: false });
    console.log("Telegram webhook removed. Pending updates were preserved.");
    return;
  }

  const info = await api.getWebhookInfo();
  console.log(
    JSON.stringify({
      configured: Boolean(info?.url),
      pendingUpdateCount: Number(info?.pending_update_count || 0),
      hasCustomCertificate: Boolean(info?.has_custom_certificate),
      lastErrorAt: info?.last_error_date
        ? new Date(info.last_error_date * 1000).toISOString()
        : null,
    })
  );
};

run().catch((error) => {
  fail(error instanceof Error ? error.message : "Telegram webhook command failed");
});
