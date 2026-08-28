# Data Model: Мобильная полировка и устойчивые отчёты

Новая Prisma-сущность не создаётся. Используются существующие `Task`, `SubTask`, `User`, `AnalyticsSnapshot` и `AiUsageDaily`.

## ReadOnlyTaskCard

- Существующие `taskId`, `title`, `date`, `priority`, `energyLevel`, `category`, `estimatedMinutes`.
- `completedSubtasks` и `totalSubtasks` вычисляются из existing subtasks.
- Только display; mutation transition отсутствует.

## BulkMoveIntent

- `taskIds`: непустой набор выбранных активных задач.
- `targetDate`: локальная `YYYY-MM-DD`.
- `mode`: `tomorrow | selected-date`.
- Result: `succeededIds`, `failedIds`; при partial failure selected остаются failed ids.

## StoredAnalyticsReportV1

- `version`: `1`.
- `ownerId`: authenticated positive integer.
- `period`: `week | month`.
- `from`, `to`: `YYYY-MM-DD` границы snapshot.
- `text`: non-empty successful AI report.
- `createdAt`: ISO timestamp.
- Identity: `ownerId + period + from + to`.
- Lifecycle: absent → saved/restored; saved → explicit delete; saved → successful regenerate → replaced. Failed regenerate retains saved.

## Public Forever presentation

- `displayName`: `Forever`.
- `cta`: disabled `Скоро`.
- `internalFounderActive`: read-only current-plan value; показывает lifetime status, не мутирует plan.

## Existing AiUsageDaily audit

- Identity: user/day/plan/provider/model.
- Aggregates: requests, priced/tokenized requests, token counts, estimated cost microUSD.
- Никакого request/response/task/note text; schema transition отсутствует.

