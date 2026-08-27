# Data Model: Telegram Bot MVP

Все модели добавляются в существующую PostgreSQL и доступны только через
`backend/lib/prisma.js`. Telegram identifiers представлены строками, чтобы избежать ошибок
JSON/JavaScript и сохранить точное значение.

## TelegramConnection

Активная связь пользователя Glowy с одним private Telegram account/chat.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | integer | Primary key |
| `userId` | integer | Unique FK User, cascade delete |
| `telegramUserId` | string(32) | Unique, digits only |
| `chatId` | string(32) | Private chat destination |
| `pendingCommand` | nullable string(20) | Only `ADD`; otherwise null |
| `pendingCommandExpiresAt` | nullable datetime | Must accompany pending command |
| `connectedAt` | datetime | Creation time |
| `updatedAt` | datetime | Last state change |

Unlink deletes the row and cascades temporary drafts. Re-linking requires a new code.

## TelegramLinkCode

Короткоживущее доказательство, выпущенное авторизованным web-пользователем.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | integer | Primary key |
| `userId` | integer | FK User, cascade delete, indexed |
| `codeHash` | string(64) | Unique HMAC-SHA-256 hex; raw code never stored |
| `expiresAt` | datetime | No later than 10 minutes after creation |
| `usedAt` | nullable datetime | Set atomically on successful bind |
| `createdAt` | datetime | Creation time |

Generation invalidates previous unused codes. Consumption requires `usedAt = null` and
`expiresAt > now`, then creates the connection and marks the code used in one transaction.

## TelegramTaskDraft

Temporary normalized task shown before explicit confirmation.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID string | Primary key; safe inside callback payload |
| `connectionId` | integer | FK TelegramConnection, cascade delete |
| `userId` | integer | FK User, cascade delete and indexed ownership check |
| `title` | string(255) | Non-empty |
| `date` | string(10) | `YYYY-MM-DD` or empty |
| `priority` | string(50) | Existing Glowy value |
| `energyLevel` | string(10) | `low`, `med`, `high` |
| `category` | string(100) | Existing task category contract |
| `status` | string(20) | `PENDING`, `CONFIRMED`, `CANCELED`, `EXPIRED` |
| `expiresAt` | datetime | At most 30 minutes |
| `taskId` | nullable integer | Unique FK Task after confirmation |
| `createdAt` | datetime | Creation time |
| `confirmedAt` | nullable datetime | Confirmation time |
| `sourceUpdateId` | nullable string(32) | Unique source update for retry-safe AI draft creation |

```text
PENDING -> CONFIRMED (owner callback + Task in one transaction)
PENDING -> CANCELED  (owner callback)
PENDING -> EXPIRED   (time boundary/cleanup)
```

Terminal states cannot return to `PENDING`. Repeated confirm never creates a second task.

## TelegramWebhookUpdate

Durable, minimal queue and replay guard for webhook updates.

| Field | Type | Rules |
| --- | --- | --- |
| `updateId` | string(32) | Primary key from Telegram `update_id` |
| `payload` | nullable JSON | Required while pending/retrying; cleared after processing |
| `status` | string(20) | `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED` |
| `attempts` | integer | Default 0, maximum 3 worker attempts |
| `availableAt` | datetime | Retry eligibility |
| `lastErrorCode` | nullable string(60) | Controlled code only, never raw error/user text |
| `createdAt` | datetime | Receipt time, indexed with status |
| `updatedAt` | datetime | State change |
| `processedAt` | nullable datetime | Completion time |

Payload is cleared immediately on success and no later than 30 minutes after receipt. Rows without
payload are deleted after 7 days.

## Existing entities

- `User` receives relations to connections, link codes and drafts; account deletion cascades them.
- `Task` receives an optional reverse relation from the confirming draft and remains the common
  site/bot source of truth.
- AI counters remain on existing User/AiUsageDaily entities; Telegram adds no separate allowance.
