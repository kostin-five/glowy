# Tasks: Telegram Mini App

**Input**: Design documents from `specs/008-telegram-mini-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Auth, data, AI and mobile behavior require focused automated tests plus the manual dev
flow in `quickstart.md`.

**Organization**: Tasks are grouped by user story and use existing Glowy architecture. No task may
change `src/pages/LandingPage.tsx`, production infrastructure or production data.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Declare the channel boundary and public configuration before behavior changes.

- [X] T001 Add Mini App URL, five-minute launch age and 24-hour session configuration names with safe examples to `backend/.env.example` and `.env.example`
- [X] T002 [P] Add Telegram browser bridge TypeScript declarations and test fixtures in `src/telegram/telegramMiniAppBridge.ts` and `src/telegram/telegramMiniAppBridge.test.ts`
- [X] T003 [P] Define the allowlisted target-to-route mapping in `src/telegram/telegramMiniAppRoutes.ts` and `src/telegram/telegramMiniAppRoutes.test.ts`
- [X] T004 Update the no-database schema guard for the existing Telegram models and no-new-migration decision in `backend/test/telegram-schema.test.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared auth/session and Telegram transport primitives required by every story.

**⚠️ CRITICAL**: Complete this phase before story implementation.

- [X] T005 Extract existing web JWT/cookie issuance and safe user DTO selection without behavior changes into `backend/services/auth/auth-session.service.js` and `backend/routes/auth.routes.js`
- [X] T006 [P] Add regression tests for ordinary register/login/me/logout cookies and DTOs in `backend/test/auth-routes.test.js`
- [X] T007 [P] Add failing fixture-driven HMAC, age and malformed launch tests in `backend/test/telegram-mini-app-auth.test.js`
- [X] T008 Implement raw Telegram init data verification with controlled errors and no logging in `backend/services/telegram/telegram-mini-app-auth.service.js`
- [X] T009 Extend the Telegram Bot API client with Web App buttons/menu configuration payload support in `backend/services/telegram/telegram-api.client.js` and `backend/test/telegram-api-client.test.js`
- [X] T010 Add reusable Mini App URL construction and target allowlisting in `backend/services/telegram/telegram-mini-app-url.service.js` and `backend/test/telegram-mini-app-url.test.js`

**Checkpoint**: Existing web auth still passes and signed Telegram launches can be verified without a DB.

---

## Phase 3: User Story 1 - Открыть Glowy внутри Telegram (Priority: P1) 🎯 MVP

**Goal**: The bot and persistent launch surface open a controlled, responsive Glowy bootstrap inside Telegram.

**Independent Test**: With a mocked bridge, open `/telegram` from start/menu/navigation buttons and
verify ready/expand, target allowlist, loading and non-Telegram fallback without a white screen.

### Tests for User Story 1

- [X] T011 [P] [US1] Add bootstrap loading, bridge-missing, invalid-target and retry component tests in `src/components/telegram/TelegramMiniAppBootstrap.test.tsx`
- [X] T012 [P] [US1] Add bot start/help/app Web App button tests for linked and unlinked actors in `backend/test/telegram-worker.test.js`

### Implementation for User Story 1

- [X] T013 [US1] Implement the Telegram provider lifecycle, theme, viewport, safe-area and back-button adapter in `src/telegram/TelegramMiniAppProvider.tsx`
- [X] T014 [US1] Implement Russian bootstrap/loading/error/outside-Telegram states in `src/components/telegram/TelegramMiniAppBootstrap.tsx`
- [X] T015 [US1] Register `/telegram` without touching the landing route and wrap the application provider in `src/App.tsx`
- [X] T016 [US1] Add «Открыть Glowy» and target Web App keyboards to start/help/app responses in `backend/services/telegram/telegram-worker.service.js`
- [X] T017 [US1] Extend the webhook configuration script to validate/set the configured Mini App menu URL without printing secrets in `backend/scripts/telegram-webhook.js`

**Checkpoint**: Glowy reliably opens inside Telegram and outside-Telegram access fails safely; auth can still be pending.

---

## Phase 4: User Story 2 - Зарегистрироваться, войти и привязаться автоматически (Priority: P1)

**Goal**: A Telegram-only user can create an ordinary Glowy account, an existing user can log in,
and repeat launches auto-authenticate while unlink immediately revokes channel access.

**Independent Test**: Register new, log in existing, repeat bootstrap, exercise both conflict types,
unlink and confirm the next protected call is unauthorized with all ordinary account data intact.

### Tests for User Story 2

- [X] T018 [P] [US2] Add failing HTTP contract tests for session/register/login, five-minute launch expiry, 24-hour cookie, generic errors, connection conflicts and a separate warmed-session recovery measurement under 3 seconds in `backend/test/telegram-mini-app-routes.test.js`
- [X] T019 [P] [US2] Add failing middleware tests for short Telegram claims, active connection checks and unlink revocation in `backend/test/auth-middleware-telegram.test.js`
- [X] T020 [P] [US2] Add frontend tests for in-app login/register, validation, conflict and auth-store hydration in `src/components/telegram/TelegramMiniAppAuth.test.tsx`

### Implementation for User Story 2

- [X] T021 [US2] Implement transactional register/login/link and repeat-session orchestration over shared auth rules in `backend/services/telegram/telegram-mini-app-session.service.js`
- [X] T022 [US2] Add `/mini-app/session`, `/mini-app/register` and `/mini-app/login` channel endpoints with rate limits in `backend/routes/telegram.routes.js`
- [X] T023 [US2] Issue short Telegram-bound claims and validate their current connection in `backend/services/auth/auth-session.service.js` and `backend/middleware/auth.middleware.js`
- [X] T024 [US2] Preserve normal web registration/login behavior while routing shared credential work through the common service in `backend/routes/auth.routes.js`
- [X] T025 [US2] Add typed Mini App auth calls that never persist or log init data in `src/api/TelegramMiniAppApi.ts`
- [X] T026 [US2] Implement Russian in-Mini-App register/login UI with current legal acknowledgements in `src/components/telegram/TelegramMiniAppAuth.tsx`
- [X] T027 [US2] Connect bootstrap session restore/auth completion to the existing Zustand auth state in `src/components/telegram/TelegramMiniAppBootstrap.tsx` and `src/store/useAuthStore.ts`
- [X] T028 [US2] Make settings unlink clearly preserve the Glowy account and revoke Telegram access in `src/components/settings/TelegramConnectionPanel.tsx`

**Checkpoint**: Website use is optional; one normal Glowy profile is automatically tied to verified Telegram.

---

## Phase 5: User Story 3 - Пользоваться полным Glowy как Mini App (Priority: P1)

**Goal**: All chosen authenticated sections use the existing routes/data inside Telegram, while
payment/recovery/security transitions open externally and ordinary web remains unchanged.

**Independent Test**: From a linked session visit home, tasks, notes, AI, progress, analytics and
settings; mutate shared data and observe it on web; test safe areas/back/external payment at mobile widths.

### Tests for User Story 3

- [X] T029 [P] [US3] Add provider-aware layout, safe-area and native-back tests in `src/layout/AppLayout.test.tsx` and `src/components/layout/BottomNav.test.tsx`
- [X] T030 [P] [US3] Add external-link allowlist and normal-browser fallback tests in `src/telegram/telegramExternalLink.test.ts`
- [X] T031 [P] [US3] Add route integration coverage for all seven Mini App targets in `src/App.test.ts`

### Implementation for User Story 3

- [X] T032 [US3] Adapt shared layout/header/bottom navigation for Telegram viewport and safe areas in `src/layout/AppLayout.tsx`, `src/components/layout/Header.tsx` and `src/components/layout/BottomNav.tsx`
- [X] T033 [US3] Preserve Telegram context while navigating the existing protected routes and fullscreen AI in `src/telegram/TelegramMiniAppProvider.tsx` and `src/App.tsx`
- [X] T034 [US3] Implement allowlisted native external-link handling with browser fallback in `src/telegram/telegramExternalLink.ts`
- [X] T035 [US3] Route YooKassa confirmation externally from Mini App while preserving web behavior in `src/pages/PricingPage.tsx`
- [X] T036 [US3] Route legal links exposed by Mini App auth externally and verify no recovery/security actions are exposed there in `src/components/telegram/TelegramMiniAppAuth.tsx`
- [X] T037 [US3] Verify existing offline/cache startup never intercepts or blanks the Telegram bootstrap in `src/App.tsx` and `src/components/ui/AppErrorBoundary.tsx`

**Checkpoint**: The full authenticated Glowy product works as one UI/data system inside Telegram and web.

---

## Phase 6: User Story 4 - Использовать бот как расширенный быстрый пульт (Priority: P1)

**Goal**: Rich safe commands cover navigation, today/upcoming/energy/progress, add/done/AI while full editing stays in Mini App.

**Independent Test**: Run every command as linked/unlinked, repeat each mutation callback, try a
foreign/stale task and verify ownership, confirmation, limits and target buttons.

### Tests for User Story 4

- [X] T038 [P] [US4] Add command/menu/navigation, unlinked privacy and explicit voice-without-STT fallback tests in `backend/test/telegram-worker-navigation.test.js`
- [X] T039 [P] [US4] Add `/tasks`, `/progress` and bounded-output tests in `backend/test/telegram-worker-read.test.js`
- [X] T040 [P] [US4] Add `/done` pick/confirm/cancel/foreign/repeat-XP tests in `backend/test/telegram-worker-done.test.js`
- [X] T041 [P] [US4] Add `/ai` pending flow, limit, provider failure and no-persistence tests in `backend/test/telegram-worker-ai.test.js`

### Implementation for User Story 4

- [X] T042 [US4] Extract route-equivalent idempotent completion/XP rules for HTTP and bot reuse in `backend/services/tasks/task-completion.service.js` and `backend/routes/task.routes.js`
- [X] T043 [US4] Implement the full Russian command/menu catalogue and target keyboards in `backend/services/telegram/telegram-worker.service.js`
- [X] T044 [US4] Implement bounded `/tasks` and existing progress summary reads with ownership checks in `backend/services/telegram/telegram-worker.service.js`
- [X] T045 [US4] Implement `/done` select then confirm/cancel flow through the shared completion service in `backend/services/telegram/telegram-worker.service.js`
- [X] T046 [US4] Make energy selection an explicit idempotent action with cancel/Mini App navigation in `backend/services/telegram/telegram-worker.service.js`
- [X] T047 [US4] Implement `/ai` ask-next-message and inline-text paths using existing provider/limit without persistence in `backend/services/telegram/telegram-worker.service.js`
- [X] T048 [US4] Add idempotent `setMyCommands` registration for the final Russian command catalogue without exposing configuration values in `backend/services/telegram/telegram-api.client.js` and `backend/scripts/telegram-webhook.js`

**Checkpoint**: The bot is useful without duplicating full CRUD or bypassing Glowy backend rules.

---

## Phase 7: User Story 5 - Надёжно переживать сбои (Priority: P2)

**Goal**: Retry, replay, slow network, expired sessions and worker restart produce calm states without duplicates or leaks.

**Independent Test**: Replay updates/callbacks, interrupt bootstrap and worker, expire init data and
pending flows, simulate API/DB/network failures and inspect redacted logs.

### Tests for User Story 5

- [X] T049 [P] [US5] Add bootstrap slow/offline/retry/unmount race tests in `src/components/telegram/TelegramMiniAppBootstrap.test.tsx`
- [X] T050 [P] [US5] Extend webhook/worker replay, stale processing and cleanup tests for new commands in `backend/test/telegram-update.test.js` and `backend/test/telegram-worker.test.js`
- [X] T051 [P] [US5] Add logger redaction assertions for init data, auth input, commands and callbacks in `backend/test/telegram-mini-app-routes.test.js` and `backend/test/telegram-worker.test.js`

### Implementation for User Story 5

- [X] T052 [US5] Add abort-safe bootstrap retry and expired-session recovery without redirect loops in `src/components/telegram/TelegramMiniAppBootstrap.tsx`
- [X] T053 [US5] Bound pending command expiry, callback retries and controlled worker error codes in `backend/services/telegram/telegram-worker.service.js` and `backend/services/telegram/telegram-update.service.js`
- [X] T054 [US5] Ensure webhook validation, queue ACK and app CSRF exceptions remain limited to the exact machine endpoint in `backend/app.js` and `backend/routes/telegram.routes.js`

**Checkpoint**: Failures are recoverable, mutations remain once-only and logs remain free of protected content.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Operations, documentation, accessibility and complete verification.

- [X] T055 [P] Update architecture and v2.8.0 roadmap boundaries from Bot MVP to Mini App in `docs/architecture.md` and `docs/product-roadmap.md`
- [X] T056 [P] Rewrite safe BotFather/menu/webhook/dev-to-prod cutover instructions and secret rotation reminders in `docs/telegram-bot-operations.md`
- [X] T057 [P] Update setup documentation for Mini App URL, five-minute launch proof and 24-hour channel auth in `README.md`
- [X] T058 Audit all new Russian states, focus handling, keyboard overlap, touch targets and 320/360/390/430 px layout in `src/components/telegram/` and `src/layout/AppLayout.tsx`
- [X] T059 Run `npx prisma validate`, backend tests, frontend typecheck/lint/tests/build and `git diff --check`, recording results in `specs/008-telegram-mini-app/quickstart.md`
- [ ] T060 Perform the non-production manual scenarios in `specs/008-telegram-mini-app/quickstart.md` and record any unrun real-Telegram checks as release gates

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup → Foundational → US1/US2 bootstrap and identity.
- US2 is required before authenticated US3 paths and linked US4 personal commands can be verified end-to-end.
- US3 and US4 can proceed independently after US2; US5 follows their final behavior.
- Polish follows all selected stories.

### User Story Dependencies

- **US1**: requires foundational bridge/URL services; independently proves launch UX.
- **US2**: requires foundational auth/init validation; independently proves identity and revocation.
- **US3**: uses US1 provider and US2 session; product APIs remain independently testable.
- **US4**: uses US2 connection and existing worker; does not depend on US3 screen implementation beyond stable target URLs.
- **US5**: exercises the completed flows from US1–US4.

### Parallel Opportunities

- `[P]` tests/config tasks use distinct files and may be prepared together.
- After US2, client-focused US3 and backend-focused US4 touch mostly separate modules.
- Documentation tasks T055–T057 may run together after public behavior stabilizes.

## Parallel Examples

```text
US2: backend HTTP contract tests (T018), middleware tests (T019), frontend auth tests (T020)
US3: layout tests (T029), external-link tests (T030), route tests (T031)
US4: navigation (T038), reads (T039), completion (T040), AI (T041)
```

## Implementation Strategy

1. Preserve the already deployed additive Telegram schema and make ordinary web auth regression-green.
2. Deliver launch + self-contained register/login/auto-login before adding rich bot commands.
3. Reuse each existing Glowy screen and API, applying only Telegram environment adapters.
4. Add commands in read → confirmed mutation → AI order, running focused tests after each slice.
5. Complete reliability/full suite locally; only then request dev BotFather/deploy actions.

## Format Validation

All 60 tasks use checkbox, sequential ID, optional `[P]`, required story label in story phases and
specific repository file paths.
