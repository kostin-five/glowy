# API Contracts: Profile, Progress and Analytics

All endpoints require existing authentication unless stated otherwise. Errors use the current JSON error envelope and never include provider payloads or user text.

## Profile preferences

### `GET /api/user/preferences`

Response `200`:

```json
{
  "avatarId": "orbit-mint",
  "aiTone": "calm",
  "focusBetaEnabled": false,
  "canUseFocusFeatures": false,
  "focusBetaAvailable": false
}
```

### `PATCH /api/user/preferences`

Request accepts any subset:

```json
{
  "avatarId": "orbit-mint",
  "aiTone": "moderate",
  "focusBetaEnabled": false
}
```

Rules:

- `avatarId` is a known catalog identifier or null.
- `aiTone` is `calm`, `moderate` or `strict`.
- `focusBetaEnabled` remains accepted for backward compatibility but no longer gates deep analytics.

Response `200`: same shape as GET. Invalid input returns `400`; disallowed enablement returns `403`.

## Task extensions

Existing `POST /api/tasks` and `PUT /api/tasks/:id` accept:

```json
{
  "estimatedMinutes": 60,
  "actualMinutes": 75,
  "completed": true,
  "completedOn": "2026-08-16"
}
```

Rules:

- Duration values are nullable whole minutes from 1 to 1,440.
- `completedOn` is required when changing incomplete to complete and must be a valid `YYYY-MM-DD` not later than the client's current date accepted by the flow.
- Changing complete to incomplete clears `completedOn` server-side.
- Task responses include nullable `completedOn`, `estimatedMinutes` and `actualMinutes`.

## Progress overview

### `GET /api/progress?today=YYYY-MM-DD`

Response `200`:

```json
{
  "xp": { "current": 120, "level": 3, "nextLevelAt": 250 },
  "taskStreak": {
    "current": 4,
    "lastActiveOn": "2026-08-15",
    "missedDateEligibleForRescue": "2026-08-14"
  },
  "rescues": { "remaining": 2, "monthlyLimit": 3, "usedDates": ["2026-08-14"] },
  "habits": [],
  "achievements": []
}
```

The server reconciles achievement awards idempotently before returning the response.

### `POST /api/progress/rescues`

Request:

```json
{ "protectedOn": "2026-08-14", "today": "2026-08-16" }
```

Response `201`: updated progress overview. Invalid/non-connecting date returns `400`; duplicate or exhausted monthly allowance returns `409`.

## Habits

### `POST /api/progress/habits`

Request: `{ "title": "Выпить стакан воды" }`.

Response `201`: habit summary including `id`, `title`, `archived`, `currentStreak`, `checkedToday`, timestamps.

### `PATCH /api/progress/habits/:id`

Request accepts `{ "title": "..." }` and/or `{ "archived": true }`.

Response `200`: updated habit summary. Non-owner receives `404` to avoid exposing existence.

### `PUT /api/progress/habits/:id/checks/:date`

Creates today's/date check idempotently. Response `200` if already checked or `201` if created.

### `DELETE /api/progress/habits/:id/checks/:date`

Removes a check owned by the user. Response `200` with updated habit summary.

## Analytics

### `GET /api/analytics?period=week|month&anchor=YYYY-MM-DD`

Response `200`:

```json
{
  "period": { "kind": "week", "from": "2026-08-10", "to": "2026-08-16" },
  "completedTasks": 5,
  "energyDistribution": { "low": 2, "med": 2, "high": 1 },
  "taskStreak": 4,
  "time": {
    "estimatedMinutes": 240,
    "actualMinutes": 270,
    "tasksWithEstimate": 4,
    "tasksWithActual": 3
  },
  "hasActivity": true,
  "canRequestAiInsight": false,
  "focusBetaEnabled": false
}
```

Boundary dates are inclusive. Counts derive from `completedOn`, not planned task date.

### `POST /api/analytics/insight`

Request:

```json
{ "period": "week", "anchor": "2026-08-16" }
```

The server recalculates the snapshot and sends only numeric/category aggregates to the AI provider. It does not trust client-submitted aggregates.

Response `200`:

```json
{
  "insight": "На этой неделе...",
  "cost": 5,
  "usage": { "limit": 100, "remaining": 74, "resetAt": "..." }
}
```

Start/non-eligible users receive `403`. Empty analytics returns `422` without consuming an AI request. A weekly request costs 5 daily AI-limit units and a monthly request costs 10; insufficient allowance returns `429` before the provider is called.

## Operator-only AI accounting

No public admin endpoint is added. Successful authenticated AI provider calls update `AiUsageDaily` through the shared accounting service. Unit-economics reporting initially uses a documented read-only Prisma/SQL query executed by the owner against dev data, never user text.
