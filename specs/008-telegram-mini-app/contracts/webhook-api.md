# Telegram Webhook API Contract

## `POST /api/telegram/webhook`

Public machine endpoint exempt from browser CSRF only for this exact path. It requires header:

```text
X-Telegram-Bot-Api-Secret-Token: <backend-only secret>
```

Accepted body is a Telegram `Update` containing integer `update_id` and one supported `message` or
`callback_query`.

- `200 { "ok": true }`: new update durably queued or duplicate already known.
- `400 { "ok": false }`: malformed update; no payload details echoed.
- `401 { "ok": false }`: missing/invalid secret.
- `503 { "ok": false }`: queue persistence unavailable, allowing Telegram to retry.

The endpoint performs no AI, task mutation or Telegram API response before `200`. Duplicate
`update_id` is not queued twice. Logs contain request id and controlled status only.

## Worker contract

- Claims only eligible `PENDING` updates and stale `PROCESSING` updates.
- At most three attempts with bounded backoff.
- Revalidates connection and ownership at action time.
- Clears successful payload; clears expired/terminal failed payload no later than 30 minutes.
- Is not started from `createApp()` or backend HTTP tests; `server.js` controls lifecycle.
