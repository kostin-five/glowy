# Data Model: Telegram Mini App

Mini App не добавляет пользователя или копии продуктовых сущностей. Все операции используют
существующую PostgreSQL только через `backend/lib/prisma.js`. Текущая migration
`20260826220000_add_telegram_bot` уже содержит необходимые Telegram entities; redesign не требует
новой migration по плану.

## User (existing)

Обычная учётная запись Glowy и единственный владелец задач, заметок, прогресса, тарифа и AI usage.
Регистрация в Mini App создаёт тот же `User`, что web-регистрация: уникальный normalised email,
bcrypt password hash и текущие defaults. Telegram-specific plan/limits не добавляются.

## TelegramConnection (existing, reused)

Отзываемое one-to-one соответствие проверенного Telegram пользователя и `User`.

| Field | Use in redesigned v2.8.0 |
| --- | --- |
| `id` | Попадает только в server-side Telegram session claim и ownership queries |
| `userId` | Unique FK к единственному Glowy User |
| `telegramUserId` | Unique digits-only identity из проверенного `initData`/webhook |
| `chatId` | Private chat destination; обновляется только из проверенного private-chat update |
| `pendingCommand` | `ADD` или `AI`; другое значение считается отсутствующим |
| `pendingCommandExpiresAt` | Не более 10 минут; просроченное состояние игнорируется |
| `connectedAt`, `updatedAt` | Audit metadata без Telegram profile/text |

### Creation paths

```text
Mini App register: validated initData + new User -> connection (one transaction)
Mini App login: validated initData + verified credentials -> connection (transaction)
Web compatibility: authenticated User + one-use code -> connection (existing flow)
```

Conflicts never replace a row silently. Deleting connection cascades Telegram drafts and makes
channel-bound auth invalid on the next protected request.

## Telegram-bound auth claim (not persisted)

Claim with a maximum 24-hour lifetime inside the existing signed Glowy JWT:

| Claim | Rule |
| --- | --- |
| `id` | Existing User id |
| `channel` | Exact value `telegram-mini-app` |
| `telegramConnectionId` | Existing connection id |
| `iat`, `exp` | Standard signed timestamps; Telegram-bound expiry is no more than 24 hours |

`authMiddleware` accepts it only while connection id still belongs to `id`. Token and raw init
data are never stored in Prisma or frontend persistence.

## VerifiedLaunch (transient value object)

Created in memory only after backend validation of raw `initData`:

| Field | Validation |
| --- | --- |
| `telegramUserId` | decimal string from signed `user.id` |
| `authDate` | valid Unix time, not in future, no older than 5 minutes |
| `queryId` | optional bounded Telegram value; never logged |

Unsigned name/username/photo are not required, not persisted and not used for account decisions.

## TelegramTaskDraft (existing, reused)

Pending `/add` result remains the only bot-created mutable draft. State machine:

```text
PENDING -> CONFIRMED (explicit owner callback + Task in one transaction)
PENDING -> CANCELED  (explicit owner callback)
PENDING -> EXPIRED   (30-minute boundary/cleanup)
```

Repeated confirmation returns the existing terminal outcome and never creates another Task.

## TelegramWebhookUpdate (existing, reused)

Durable update queue/replay guard remains unchanged: `PENDING -> PROCESSING -> PROCESSED|FAILED`,
maximum bounded attempts, payload cleared after processing or terminal expiry. Mini App auth
requests never enter this queue.

## Task, Note, progress, subscription and AI usage (existing)

- Mini App calls the same authenticated API as web.
- `/done` selects an owned incomplete Task and calls shared completion logic; setting completed
  twice must not repeat XP/achievement effects.
- `/energy` sets existing `User.currentEnergy` to a selected bounded value.
- `/ai` uses existing AI counters and provider; it persists no Telegram message/history.
- Notes, analytics, settings and payments receive no Telegram-specific copy or table.

## Data retention and privacy

- Bot token, webhook secret, link-code secret, raw `initData`, password/JWT and user text are never
  logged.
- Telegram username, names, photo and audio are not persisted.
- Pending command state expires after 10 minutes, task drafts after 30 minutes, webhook payload
  follows the existing cleanup policy.
- Unlink deletes the connection and temporary Telegram data; ordinary Glowy User/data remain.
