# Telegram Mini App API Contract

All endpoints accept JSON, require an allowed Glowy Origin/Referer and never echo or log raw
`initData`. Telegram-specific endpoints are channel adapters over the existing auth/session rules.

## `POST /api/telegram/mini-app/session`

Body: `{ "initData": "<raw Telegram.WebApp.initData>" }`.

- `200`: active connection found; set a maximum 24-hour HttpOnly Glowy cookie and return the normal safe
  user DTO (`id`, `name`, `email`, `xp`, `level`, `avatarId`, `aiTone`).
- `409 { "code": "TELEGRAM_REGISTRATION_REQUIRED" }`: launch is valid but unlinked; no cookie.
- `401`: invalid, missing, future or expired launch data.
- `409 { "code": "TELEGRAM_LINK_CONFLICT" }`: inconsistent ownership; do not reveal the other user.
- `503`: Telegram auth is not configured.

## `POST /api/telegram/mini-app/register`

Body contains raw `initData` plus the same `name`, `email`, `password` contract as ordinary Glowy
registration. The UI presents the current consent/legal links before submit.

On `201`, create one ordinary `User` and its `TelegramConnection` atomically, set a short-lived
Telegram-bound cookie and return the normal safe user DTO. Existing email returns the same safe
registration error as web. Connection conflicts return `409`; no orphan User may remain.

## `POST /api/telegram/mini-app/login`

Body contains raw `initData`, `email` and `password`. Credentials use the common login validator.
On `200`, create the missing connection atomically or verify the existing same-user connection,
then set the Telegram-bound cookie and return the safe user DTO. Invalid credentials use the same
generic error as web. A connection to another User is never replaced silently.

## Session behavior

- Existing `/api/auth/me`, `/api/auth/logout` and all product APIs remain unchanged for clients.
- Raw launch data is accepted only during the first 5 minutes after its signed `auth_date`.
- Telegram-bound JWTs live no longer than 24 hours and are accepted only while the claimed
  connection still belongs to the User.
- `DELETE /api/user/telegram` makes the next protected request return `401`.
- Ordinary web JWT behavior and cookie name remain backward compatible.
