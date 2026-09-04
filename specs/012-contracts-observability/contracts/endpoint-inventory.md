# Actual HTTP endpoint inventory (v2.9.0 working state)

Источник: mounts в `backend/app.ts`, route handlers в `backend/routes/`, frontend clients в
`src/api/` и прямые consumers. Это описание фактического состояния до v2.9.0, включая
неоднородные error envelopes.

## Общие правила baseline

- Защищённые routes принимают HttpOnly cookie `glowy_token` или Bearer JWT. Отсутствующая/
  невалидная сессия: `401 { message: "Пользователь не авторизован" }`.
- Unsafe web requests до route могут получить `403 { error: "Доступ запрещен" }` от origin/CSRF
  middleware. YooKassa и Telegram webhooks исключены из CSRF и имеют provider verification.
- Каждый ответ уже получает header `X-Request-Id`; baseline error body request ID не содержит.
- Validation сейчас возвращает либо `{ error: string }`, либо `{ errors: ValidationError[] }`.
- Неожиданные route errors обычно возвращают `{ error: string }`; unhandled middleware — generic
  500. Формат будет унифицироваться только внутри утверждённого slice.

## Shape glossary

- `SafeUser`: `{ id, name, email, xp, level, avatarId, aiTone }`.
- `Task`: Prisma task + ordered `subtasks` + `noteLinks`; task date — `YYYY-MM-DD | ""`.
- `TaskUpdateResult`: `{ task, xpReward, xpOutcome, userProgress }`.
- `SubTask`: `{ id, taskId, title, completed, position, createdAt, updatedAt }`.
- `Limit`: `{ limit, remaining, resetAt }`; `Usage`: `{ plan, used, limit, remaining }`.
- `MindHubResult`: `{ drafts, reply, limit? }`; draft соответствует подтверждаемому `TaskDraft`.
- `SubtaskDraftResult`: `{ subtasks: [{ title }], limit }`; 2–8 несохранённых уникальных шагов.
- `PlanState`: `{ plan, subscriptionStatus, planExpiresAt, ...public entitlement flags }`.
- `Note`: note + ordered task links; `ProgressOverview`, `AnalyticsSnapshot`, `Habit` соответствуют
  существующим Zod schemas в `src/types`.

## Auth domain — 4 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `POST /api/auth/register` | Public + rate limit 10/hour/IP | body `{ name, email or login, password(8..20) }` | `201 SafeUser`, sets auth cookie | 400 `{error}` invalid/duplicate; 429 `{error}` | `AuthApi.registerRequest` → `RegisterPage` |
| `POST /api/auth/login` | Public + rate limit 5/15m/IP+email | body `{ email or login, password }` | `200 SafeUser`, sets auth cookie | 400 `{error}` missing/invalid credentials; 429 `{error}` | `AuthApi.loginRequest` → `LoginPage` |
| `POST /api/auth/logout` | Public/idempotent | empty | `200 { message: "Выход выполнен" }`, clears cookie | global origin errors | `AuthApi.logoutRequest` → `useLogout` |
| `GET /api/auth/me` | User session | none | `200 SafeUser` | 401 `{message}`; 404/500 `{error}` | `AuthApi.meRequest` → `useAuthStore.restoreAuthSession` |

## Tasks domain — 8 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `GET /api/tasks` | User session | none | `200 Task[]` | 500 `{error}` | `TaskApi.getTasks` → `useTaskStore`, offline reconciliation |
| `POST /api/tasks` | User session | body `TaskDraft`, title required; optional energy/priority/category/date/minutes | `201 Task` | 400 `{errors}` or `{error}`; 500 `{error}` | `TaskApi.postTask` → `useTaskStore`, offline sync, Mind Hub confirmation via store |
| `PUT /api/tasks/:id` | User session/owner | positive id; partial Task + optional ordered subtasks; completion requires `completedOn` | `200 TaskUpdateResult` (legacy plain Task tolerated by client) | 400 `{error|errors}`; 403 `{error}`; 500 `{error}` | `TaskApi.putTask` → `useTaskStore`, offline sync |
| `DELETE /api/tasks/:id` | User session/owner | positive id | `200 { message: "Удалено" }` | 400/403/500 `{error}` | `TaskApi.deleteTask` → `useTaskStore`, offline sync |
| `GET /api/subtasks/:taskId` | User session/owner | positive taskId | `200 SubTask[]` | 400/404/500 `{error}` | `SubTaskApi.fetchSubTasks` |
| `POST /api/subtasks` | User session/owner | body `{ taskId, title }` | `201 SubTask` | 400 `{error|errors}`; 404/500 `{error}` | `SubTaskApi.createSubTask` → offline sync/store |
| `PUT /api/subtasks/:id` | User session/owner | partial `{ title, completed, position }` | `200 SubTask` | 400 `{errors}`; 403/500 `{error}` | `SubTaskApi.toggleSubTask/updateSubTask` → offline sync/store |
| `DELETE /api/subtasks/:id` | User session/owner | positive id expected but not explicitly validated | `200 { message: "Удалено" }` | 403/500 `{error}` | `SubTaskApi.deleteSubTask` → offline sync/store |

## AI domain — 5 HTTP operations plus internal consumers

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `GET /api/ai/usage` | User session | none | `200 Usage` | 500 `{error}` | `AiApi.getAiUsage` → `SettingsPage` |
| `POST /api/ai/analyze` | User session | empty | `200 { message, aiUnavailable?, retryable?, code? }` | provider/500 `{error}` | `AiApi.getAdvice`; no current page caller found |
| `POST /api/ai/mind-hub` | User session + tariff limit | `{ message, hubMode: chat|parse|auto, messages[], currentEnergy }` | `200 MindHubResult`; provider failure may be graceful 200 | 400 `{error}`; 429 `{error,limit}`; 5xx `{error}` | `AiApi.parseMindHub` → `MindHubChat`; Telegram uses same services directly |
| `POST /api/ai/subtask-draft` | User session + shared tariff limit | bounded task context + existing subtask titles | `200 SubtaskDraftResult`; no data mutation | 400/401/429/502/503/500 safe error envelope | `AiApi.createSubtaskDraft` → create/edit task modal |
| `POST /api/chat` | User session + 15/hour in-memory | body ignored | `200 { message: "Запрос к ИИ прошел успешно!" }` | 429/500 `{error}` | No frontend consumer found; legacy candidate |

Internal AI-limit/provider consumers included in AI slice:

- `POST /api/analytics/insight`: cost 5/10.
- `POST /api/notes/:id/task-draft`: cost 1.
- Telegram worker AI commands/draft flow: cost 1 through shared services.
- Successful provider usage accounting in `AiUsageDaily`; no prompts are stored there.

Retired in the v2.9.0 AI slice: the unauthenticated Mind Hub operation at
`/api/ai/mind-hub/public`. Guest/stale client state no longer sends an AI network request.

## Payments domain — 5 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `POST /api/payments/yookassa/webhook` | Public endpoint; provider re-fetch verification | YooKassa event | `200 { ok: true }`, idempotent | 500 `{error}` for config/provider/processing | YooKassa |
| `GET /api/payments/current-plan` | User session | none | `200 PlanState`; expired Focus may normalize to Start | 404/500 `{error}` | `PaymentApi.getCurrentPlan` → Pricing/PaymentSuccess |
| `POST /api/payments/focus/create` | User session + 5/15m | empty | `200 { paymentId, confirmationUrl }` | 409 `{code,error,planExpiresAt?}`; 429 `{error,limit}`; 500 `{error}` | `PaymentApi.createFocusPayment` → `PricingPage` |
| `POST /api/payments/forever/create` | User session + feature flag + 5/15m | empty | `200 { paymentId, confirmationUrl }` | 403/409 `{code,error}`; 429 `{error,limit}`; 500 `{error}` | No current frontend method; approved flow retained |
| `POST /api/payments/forever/activate` | User session + 5/15m | empty | none | `410 { code: "PLAN_UNAVAILABLE", error }` before DB mutation | No current frontend consumer; regression-tested guard |

## Analytics domain — 9 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `GET /api/analytics` | User session | query `{ period: week|month, anchor: YYYY-MM-DD }` | `200 AnalyticsSnapshot` | 400/500 `{error}` | `AnalyticsApi.getSnapshot` → `AnalyticsPage` |
| `POST /api/analytics/insight` | User session + Focus/Forever + AI cost | body `{ period, anchor }` | `200 { insight, usage: Limit, cost }` | 400/403/422/429/503 `{error,limit?}` | `AnalyticsApi.requestInsight` → `AnalyticsPage` |
| `GET /api/progress` | User session | query `{ today: YYYY-MM-DD, month?: YYYY-MM }` | `200 ProgressOverview` | 400/500 `{error}` | `ProgressApi.getOverview` → `SuccessStairsPage` |
| `POST /api/progress/rescues` | User session | `{ protectedOn, today, month? }` | `201 ProgressOverview` | 400 `{error|errors}`; 409/500 `{error}` | `ProgressApi.applyRescue` → `SuccessStairsPage` |
| `POST /api/progress/habits` | User session | `{ title<=120, today }` | `201 Habit` | 400 `{error|errors}`; 500 `{error}` | `ProgressApi.createHabit` |
| `PATCH /api/progress/habits/:id` | User session/owner | `{ title?, archived?, today }` | `200 Habit` | 400 `{errors}`; 404 `{error}` | ProgressApi archive/restore/update |
| `PUT /api/progress/habits/:id/checks/:date` | User session/owner | path date + query `today` | `200 Habit` | 400/404 `{error}` | `ProgressApi.setHabitCompleted(true)` |
| `DELETE /api/progress/habits/:id/checks/:date` | User session/owner | path date + query `today` | `200 Habit` | 400/404 `{error}` | `ProgressApi.setHabitCompleted(false)` |
| `DELETE /api/progress/habits/:id` | User session/owner | positive id | `204` empty | 400/404 `{error}` | `ProgressApi.deleteHabit` |

## Profile domain — 5 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `GET /api/user/preferences` | User session | none | `200 UserPreferences` | 404/500 `{error}` | `UserApi.getPreferences` → ProfilePreferencesPanel |
| `PATCH /api/user/preferences` | User session + entitlement for paid fields | partial allowlisted `{ avatarId, aiTone, focusBetaEnabled }` | `200 UserPreferences` | 400/403/404/500 `{error}` | `UserApi.updatePreferences` → ProfilePreferencesPanel |
| `GET /api/user/progress` | User session | none | `200 { xp, level }` | 404/500 `{error}` | `UserApi.getProgress` → `useTaskStore`, offline reconciliation |
| `PUT /api/user/energy` | User session | `{ currentEnergy }`, legacy `{ energyLimit }` accepted; clamped 0..100 | `200` current raw user record | 400 `{error|errors}`; 500 `{error}` | direct request in `useAuthStore` |
| `DELETE /api/user/account` | User session | empty | `200 { ok: true }`, deletes cascaded user data and clears cookie | 404/500 `{error}` | `UserApi.deleteAccount` → `SettingsPage` |

## Notes domain — 8 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `GET /api/notes` | User session | query `{ query<=200, archived:boolean }` | `200 Note[]`, max 500 | 400/500 `{error}` | `NoteApi.list` → `NotesPage` |
| `POST /api/notes` | User session | `{ title<=200, content<=50000 }`, one non-empty | `201 Note` | 400/500 `{error}` | `NoteApi.create` → `NotesPage` |
| `GET /api/notes/:id` | User session/owner | positive id | `200 Note` | 400/404 `{error}` | `NoteApi.get` → `NotesPage` |
| `PUT /api/notes/:id` | User session/owner | partial `{ title, content, archived }` | `200 Note` | 400/404/500 `{error}` | `NoteApi.update` → `NotesPage` |
| `POST /api/notes/:id/task-links` | User session/owner of note+task | `{ taskId }` | `201 NoteTaskLink`, idempotent upsert | 400/404 `{error}` | `NoteApi.linkTask` → `NotesPage` |
| `DELETE /api/notes/:id/task-links/:taskId` | User session/owner | positive ids | `200 { message }` | 400/404 `{error}` | `NoteApi.unlinkTask` → `NotesPage` |
| `POST /api/notes/:id/task-draft` | User session/owner + AI cost 1 | `{ fragment:1..4000 }`, must exist in saved note | `200 { draft, limit }` | 400/404/429/503 `{error,code?,limit?}` | `NoteApi.generateTaskDraft` → `NotesPage` |
| `POST /api/notes/:id/tasks` | User session/owner | confirmed TaskDraft | `201 { task, link }` | 400/404/500 `{error}` | `NoteApi.confirmTask` → `NotesPage` |

## Telegram domain — 7 operations

| Method/path | Access | Request | Success | Route errors | Known consumers |
|---|---|---|---|---|---|
| `POST /api/telegram/mini-app/session` | Public + verified initData + 20/15m/IP | `{ initData }` | `200 SafeUser`, Telegram-bound 1..24h cookie | 4xx/5xx `{code,error}`; 429 `{error}` | `TelegramMiniAppApi.restore` → Bootstrap |
| `POST /api/telegram/mini-app/register` | Public + verified initData + rate limit | `{ initData, name, email, password }` | `201 SafeUser`, cookie | 4xx/5xx `{code,error}`; 429 `{error}` | `TelegramMiniAppApi.register` → RegisterPage |
| `POST /api/telegram/mini-app/login` | Public + verified initData + rate limit | `{ initData, email, password }` | `200 SafeUser`, cookie | 4xx/5xx `{code,error}`; 429 `{error}` | `TelegramMiniAppApi.login` → LoginPage |
| `POST /api/telegram/webhook` | Telegram secret header | supported Telegram update with non-negative update_id | `200 { ok: true }`, idempotent queue upsert | 400/401 `{ok:false}`; 503 `{ok:false}` | Telegram Bot API → DB queue/production worker |
| `GET /api/user/telegram` | User session | none | `200 TelegramConnectionStatus` | 500 `{error}` | `UserApi.getTelegramConnection` → TelegramConnectionPanel |
| `POST /api/user/telegram/link-code` | User session | empty | `201 TelegramLinkCode` | domain 4xx/500 `{error}` | `UserApi.createTelegramLinkCode` → TelegramConnectionPanel |
| `DELETE /api/user/telegram` | User session | empty | `200 { ok: true }` | 500 `{error}` | `UserApi.unlinkTelegram` → TelegramConnectionPanel |

Telegram bot commands do not call these HTTP routes internally. Worker services reuse the same
Prisma instance, task-write service, AI provider and AI-limit service; their contracts are
command/callback contracts and remain documented/tested in the Telegram slice inventory.

## Platform operation — 1 operation

| Method/path | Access | Request | Success | Errors | Consumers |
|---|---|---|---|---|---|
| `GET /api/health` | Public | none | `200 { status: "ok", service: "glowy-backend" }` | process/network only | Timeweb/dev smoke checks |

## Inventory totals and v2.9 migration boundary

- Auth 4, Tasks 8, AI 5, Payments 5, Analytics 9, Profile 5, Notes 8, Telegram 7,
  platform health 1: **52 active operations**. The v2.8.0 baseline also had 52: its retired
  public Mind Hub operation is recorded above, while the authenticated subtask-draft operation
  was added as an independently tested boundary on 2026-09-04.
- Shared-contract implementation order: AI → auth → tasks → payments.
- Analytics/profile/notes/Telegram remain inventory-only except shared AI accounting/provider
  adapters required to make the AI slice correct across every client.
- `LandingPage.tsx` is explicitly outside the code-change boundary.
