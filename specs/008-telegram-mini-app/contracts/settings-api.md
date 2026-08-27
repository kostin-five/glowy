# Telegram Settings API Contract

All routes require the existing authenticated Glowy session and CSRF/origin protections. Mini App
registration/login is the primary connection path; one-use code remains backward-compatible for a
web user who wants to attach Telegram later.

## `GET /api/user/telegram`

Returns availability and connection status without Telegram numeric identifiers.

```json
{
  "available": true,
  "botUsername": "glowy_example_bot",
  "connected": false,
  "connectedAt": null
}
```

If server bot configuration is incomplete, `available=false`; secrets are never returned.

## `POST /api/user/telegram/link-code`

Creates a new 10-minute one-use link code and invalidates prior unused codes for this user.

Success `201`:

```json
{
  "code": "ABCD1234wxyz",
  "expiresAt": "2026-08-26T20:10:00.000Z",
  "deepLink": "https://t.me/glowy_example_bot?start=ABCD1234wxyz"
}
```

Errors: `409` already connected, `503` bot unavailable. The raw code appears only in this response
and is never logged or persisted.

## `DELETE /api/user/telegram`

Deletes the active connection, pending drafts and unused codes owned by the current user. Returns
`{ "ok": true }`; repeating the call is safe. Any Telegram-bound session becomes unauthorized on
its next protected request, while the ordinary Glowy account and its data remain.
