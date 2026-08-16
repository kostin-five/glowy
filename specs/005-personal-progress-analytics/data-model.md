# Data Model: Personal Progress and Analytics

All changes are additive. Existing identifiers, users, tasks, subtasks, payments and subscription values remain unchanged.

## User extensions

- `avatarId`: nullable prepared-avatar identifier, maximum 40 characters.
- `aiTone`: required enum-like string: `calm`, `moderate` or `strict`; default `calm`.
- `focusBetaEnabled`: required boolean; default `false`.

### Validation

- The backend accepts only identifiers from the versioned avatar catalog.
- Unknown stored avatar values render as the default and can be replaced.
- Invalid tone input is rejected; missing legacy values use the database default.
- The legacy beta field remains accepted for backward compatibility, but it does not gate deep analytics.

## Task extensions

- `completedOn`: nullable date-only `YYYY-MM-DD` representing the user's local completion day.
- `estimatedMinutes`: nullable integer from 1 through 1,440.
- `actualMinutes`: nullable integer from 1 through 1,440.

### State transitions

- Incomplete -> complete: set `completed = true`, set validated `completedOn`, preserve the existing XP idempotency rule.
- Complete -> incomplete: set `completed = false`, clear `completedOn`; keep `actualMinutes` so the user may edit or remove it explicitly.
- Existing completed tasks: migration backfills `completedOn` from the UTC date of `updatedAt`; this compatibility limitation is documented.

## Habit

- `id`: integer primary key.
- `userId`: owner, cascading deletion with User.
- `title`: trimmed string, 1-120 characters.
- `archived`: boolean, default `false`.
- `createdAt`, `updatedAt`: server timestamps.
- `checks`: related HabitCheck records.

### State transitions

- Active -> archived: existing checks remain readable; new checks are rejected.
- Archived -> active: allowed through explicit edit.
- Delete is not included in v2.4.0; archive provides reversible cleanup.

## HabitCheck

- `id`: integer primary key.
- `habitId`: parent habit, cascading deletion with Habit.
- `completedOn`: validated local date-only value.
- `createdAt`: server timestamp.

### Constraints

- Unique `(habitId, completedOn)` prevents duplicate daily checks.
- Check and uncheck operations must verify ownership through the parent habit.

## StreakRescue

- `id`: integer primary key.
- `userId`: owner, cascading deletion with User.
- `protectedOn`: validated missed local date.
- `createdAt`: server timestamp.

### Constraints

- Unique `(userId, protectedOn)` prevents duplicate use for one date.
- A transaction counts records whose `protectedOn` starts with the requested `YYYY-MM` and rejects the fourth use.
- The protected day must be before today, have no completed task, and connect an otherwise valid streak.

## Achievement

- `id`: integer primary key.
- `userId`: owner, cascading deletion with User.
- `key`: stable catalog key: `tasks_5`, `streak_7`, `first_habit`.
- `earnedAt`: server timestamp.

### Constraints

- Unique `(userId, key)` makes award reconciliation idempotent.
- Labels and descriptions remain frontend/catalog presentation, not copied per user.

## AiUsageDaily

- `id`: integer primary key.
- `userId`: authenticated user, cascading deletion with User.
- `usageDate`: UTC date-only value for operational aggregation.
- `plan`: effective public plan at request time.
- `provider`: normalized provider identifier.
- `model`: provider model identifier.
- `requests`: successful request count.
- `tokenizedRequests`: successful requests that included token metadata.
- `pricedRequests`: successful requests with token metadata and configured rates.
- `promptTokens`, `completionTokens`, `totalTokens`: integer totals.
- `estimatedCostMicrousd`: integer estimated cost total in one-millionth USD.
- `createdAt`, `updatedAt`: server timestamps.

### Constraints

- Unique `(userId, usageDate, plan, provider, model)` supports atomic daily upsert.
- `tokenizedRequests < requests` means token data is incomplete.
- `pricedRequests < requests` means money cost is unknown for at least one request; zero must not be presented as complete cost.
- No prompt, response, task title, habit title or chat identifier is stored.

## Relationships

- User 1:N Habit.
- Habit 1:N HabitCheck.
- User 1:N StreakRescue.
- User 1:N Achievement.
- User 1:N AiUsageDaily.
- Existing User 1:N Task remains unchanged except for additive Task fields.

## Indexes

- Habit `(userId, archived)` for active habit listing.
- HabitCheck `(completedOn)` in addition to the unique parent/date key for period reads.
- StreakRescue `(userId, protectedOn)` unique key used for month and streak reads.
- Achievement `(userId, key)` unique key.
- AiUsageDaily `(usageDate, plan)` for operator unit-economics queries, plus the unique user/date/plan/provider/model key.

## Migration and rollback

1. Add nullable/defaulted User and Task columns.
2. Backfill `tasks.completed_on` only for existing completed tasks.
3. Create new tables, foreign keys, unique constraints and indexes.
4. Generate Prisma Client and run local/test checks.
5. Keep application to Neon or Timeweb as a separate owner-operated step; Timeweb requires a fresh confirmed backup immediately before deployment.

Rollback removes only newly introduced feature tables/columns. Because rollback would discard new progress data, production rollback must prefer deploying compatible old code while retaining additive columns unless the owner explicitly approves data removal.
