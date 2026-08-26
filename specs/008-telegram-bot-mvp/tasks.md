# Tasks: Telegram Bot MVP

**Input**: Design documents from `specs/008-telegram-bot-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Security, data, auth, AI-limit and Telegram webhook paths require focused automated
tests. Backend HTTP tests remain database-free through dependency injection.

**Organization**: Tasks are grouped by user story and executed in small verifiable increments.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish configuration and adapter boundaries without activating an external bot.

- [X] T001 Add public Telegram configuration names and safe placeholders to `backend/.env.example`
- [X] T002 [P] Create injectable Bot API client boundary in `backend/services/telegram/telegram-api.client.js`
- [X] T003 [P] Add Telegram directory/module skeleton under `backend/services/telegram/` and `backend/routes/telegram.routes.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared data, webhook queue and reusable write boundary required by all stories.

**⚠️ CRITICAL**: No story work begins until this phase passes focused schema and webhook checks.

- [X] T004 Add Telegram relations and models from `data-model.md` to `backend/prisma/schema.prisma`
- [X] T005 Create additive migration SQL in `backend/prisma/migrations/20260826220000_add_telegram_bot/migration.sql` without applying it to production
- [X] T006 [P] Add schema/migration safety assertions to `backend/test/telegram-schema.test.js`
- [X] T007 Implement idempotent queue, claim, retry and payload cleanup operations in `backend/services/telegram/telegram-update.service.js`
- [X] T008 [P] Write webhook secret, malformed update and duplicate update HTTP tests in `backend/test/telegram-routes.test.js`
- [X] T009 Implement injectable webhook router and constant-time secret validation in `backend/routes/telegram.routes.js`
- [X] T010 Mount the exact webhook CSRF exception and route in `backend/app.js`
- [X] T011 Implement controlled worker lifecycle and recovery loop in `backend/services/telegram/telegram-worker.service.js` and `backend/server.js`
- [X] T012 Extract reusable validated task creation into `backend/services/tasks/task-write.service.js` and update `backend/routes/task.routes.js` without changing its contract
- [X] T013 [P] Add shared task-write behavior tests in `backend/services/tasks/task-write.service.test.js`

**Checkpoint**: Prisma validates; webhook returns before worker processing, duplicates queue once,
and no worker starts from `createApp()` tests.

---

## Phase 3: User Story 1 - Безопасная привязка Telegram (Priority: P1) 🎯 MVP

**Goal**: Authenticated user creates a short-lived code, links exactly one private Telegram account,
sees connection status and can revoke it from either channel.

**Independent Test**: Generate, consume once, retry/expire/steal the code, attempt cross-account bind,
then unlink and verify all later data commands are denied.

### Tests for User Story 1

- [X] T014 [P] [US1] Write HMAC, expiry, one-use, uniqueness and unlink service tests in `backend/test/telegram-link.test.js`
- [X] T015 [P] [US1] Write authenticated settings API tests in `backend/test/user-telegram.test.js`
- [X] T016 [P] [US1] Write disconnected/connected panel tests in `src/components/settings/TelegramConnectionPanel.test.tsx`

### Implementation for User Story 1

- [X] T017 [US1] Implement raw-code generation, HMAC storage, atomic consumption and unlink in `backend/services/telegram/telegram-link.service.js`
- [X] T018 [US1] Add status, link-code and unlink endpoints to `backend/routes/user.routes.js`
- [X] T019 [US1] Add Telegram connection schemas and API methods to `src/types/index.ts` and `src/api/UserApi.ts`
- [X] T020 [US1] Implement Russian Telegram connection UI with expiry and confirmation in `src/components/settings/TelegramConnectionPanel.tsx`
- [X] T021 [US1] Integrate the panel into the authenticated account area in `src/pages/SettingsPage.tsx`
- [X] T022 [US1] Implement `/start <code>` and `/unlink` ownership flows in `backend/services/telegram/telegram-worker.service.js`

**Checkpoint**: Account linking is independently usable; no password, JWT, Telegram identifier or
secret reaches the UI response.

---

## Phase 4: User Story 2 - План дня и энергия (Priority: P1)

**Goal**: Linked user reads today's incomplete tasks and views/changes current energy through the
same user-owned records as the web app.

**Independent Test**: Invoke commands for linked/unlinked accounts, verify owner filtering and
confirm an energy change appears in the existing web account state.

### Tests for User Story 2

- [X] T023 [P] [US2] Write `/today` owner/date/empty-state handler tests in `backend/test/telegram-worker.test.js`
- [X] T024 [P] [US2] Write `/energy` read, callback clamp and foreign-user tests in `backend/test/telegram-worker-energy.test.js`

### Implementation for User Story 2

- [X] T025 [US2] Add private-chat parsing, current connection guard and date helper in `backend/services/telegram/telegram-update.service.js`
- [X] T026 [US2] Implement `/today` formatting with owned incomplete tasks in `backend/services/telegram/telegram-worker.service.js`
- [X] T027 [US2] Implement `/energy` display and 20/40/60/80/100 callback updates in `backend/services/telegram/telegram-worker.service.js`

**Checkpoint**: Commands disclose and mutate only the linked owner and handle an empty day calmly.

---

## Phase 5: User Story 3 - Подтверждаемое создание задачи (Priority: P1)

**Goal**: `/add` converts text into one AI draft under existing plan limits and creates one Task only
after the owner presses save.

**Independent Test**: Cancel one draft, save another twice, simulate expired/foreign callbacks and
AI exhaustion, then verify zero/one Task and shared usage accounting.

### Tests for User Story 3

- [X] T028 [P] [US3] Generalize and test text-to-task draft generation in `backend/services/ai/note-task-draft.service.test.js`
- [X] T029 [P] [US3] Write `/add`, AI-limit and provider-failure tests in `backend/test/telegram-worker-add.test.js`
- [X] T030 [P] [US3] Write cancel, expiry, foreign callback and repeated-save transaction tests in `backend/test/telegram-draft-confirm.test.js`

### Implementation for User Story 3

- [X] T031 [US3] Generalize the existing note draft helper for Telegram reuse in `backend/services/ai/note-task-draft.service.js` and `backend/routes/notes.routes.js`
- [X] T032 [US3] Implement `/add <text>` and expiring next-message mode with shared AI limits in `backend/services/telegram/telegram-worker.service.js`
- [X] T033 [US3] Persist normalized pending drafts and send Russian save/cancel buttons in `backend/services/telegram/telegram-worker.service.js`
- [X] T034 [US3] Implement transactional owner-only save/cancel via `backend/services/tasks/task-write.service.js` in `backend/services/telegram/telegram-worker.service.js`

**Checkpoint**: Text and AI never create a Task; only a valid owner callback creates exactly one.

---

## Phase 6: User Story 4 - Понятная граница voice (Priority: P2)

**Goal**: Voice receives a clear Russian text fallback and never triggers STT, AI or task creation.

**Independent Test**: Send voice from linked and unlinked users and assert no download/provider/task
call while the correct guidance is returned.

### Tests and implementation for User Story 4

- [X] T035 [P] [US4] Add linked/unlinked voice no-side-effect tests to `backend/test/telegram-worker.test.js`
- [X] T036 [US4] Implement v2.8.0 voice fallback in `backend/services/telegram/telegram-worker.service.js`

**Checkpoint**: Voice boundary is explicit and has zero paid/runtime STT dependencies.

---

## Phase 7: User Story 5 - Справка и устойчивые ошибки (Priority: P2)

**Goal**: `/start` and `/help` explain the bot while retries, unknown input and dependency failures
remain safe, idempotent and observable without sensitive data.

**Independent Test**: Exercise first-run help, unknown/group input, repeated update/callback and
temporary DB/Telegram/API failures; inspect controlled outputs and logs.

### Tests for User Story 5

- [X] T037 [P] [US5] Add help, group rejection, unknown input and safe-error tests to `backend/test/telegram-worker.test.js`
- [X] T038 [P] [US5] Add retry/recovery/payload-retention tests to `backend/test/telegram-update.test.js`

### Implementation for User Story 5

- [X] T039 [US5] Complete `/start`, `/help`, unknown-command and group-chat responses in `backend/services/telegram/telegram-worker.service.js`
- [X] T040 [US5] Add controlled error codes and privacy-safe Telegram events in `backend/services/telegram/telegram-update.service.js` and `backend/lib/logger.js`
- [X] T041 [US5] Add a non-secret-printing webhook configure/status script in `backend/scripts/telegram-webhook.js` and scripts in `backend/package.json`

**Checkpoint**: Supported and failure paths are understandable, retry-safe and contain no secrets
or user text in logs.

---

## Phase 8: Polish & Cross-Cutting Verification

**Purpose**: Finish operations documentation and verify the whole release without production writes.

- [X] T042 [P] Document BotFather, env, dev webhook, rollback and v2.8.1 voice boundary in `docs/telegram-bot-operations.md`
- [X] T043 [P] Update architecture and onboarding references in `docs/architecture.md` and `docs/handoffs/DEVELOPER_ONBOARDING.md`
- [X] T044 Update v2.8.0 implementation status without claiming deployment in `docs/product-roadmap.md`
- [X] T045 Run Prisma validation, backend tests, frontend typecheck/lint/tests/build and record results in `specs/008-telegram-bot-mvp/quickstart.md`
- [X] T046 Verify `src/pages/LandingPage.tsx` is unchanged and inspect the final diff for secrets, production operations and unrelated edits
- [ ] T047 Create focused thematic commits for specification, backend foundation, user flow and documentation on `codex/v2.8.0-telegram-bot`

---

## Dependencies & Execution Order

- Setup → Foundational → US1 account link.
- US2, US3, US4 and US5 require Foundational + US1 connection guard.
- US2 and US4 can proceed independently after US1.
- US3 additionally depends on shared task write T012/T013.
- US5 integrates all handlers and follows the desired US1-US4 slice.
- Polish follows implemented stories; production migration/webhook/env are explicitly not tasks.

## Parallel Opportunities

- T002/T003, T006/T008/T013 and story-specific test files marked `[P]` touch separate files.
- After US1, US2 handler tests and US3 AI/draft tests can be prepared independently.
- Frontend panel tests (T016) and backend link tests (T014/T015) can be written in parallel.
- Operational docs T042/T043 can proceed after public configuration/contracts stabilize.

## Implementation Strategy

1. Complete schema, queue and webhook ACK foundation with tests.
2. Deliver US1 account link as the security MVP and verify it independently.
3. Add read-only `/today`, then energy callbacks.
4. Add `/add` draft and transactional confirmation, validating AI limits and duplicates.
5. Lock voice to the agreed free text fallback and complete help/error behavior.
6. Run all checks, create focused commits, then stop before any production migration or webhook.

## Release Gate

The branch may contain an additive migration and configuration documentation. Applying that
migration to production, creating/changing BotFather state, setting dev/production webhook, writing
Timeweb/Render env or pushing deployment requires separate explicit user approval. A fresh Timeweb
backup must be confirmed before any production schema migration.

