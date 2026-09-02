# Tasks: Backend TypeScript Migration

**Input**: Design documents from `/specs/013-backend-typescript-migration/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/migration-gates.md`, `quickstart.md`

**Tests**: Static, contract, domain and consumer checks are required by the specification. Existing behavior tests run against compiled output throughout the mixed-state migration; test sources themselves move to TypeScript in the final domain slice.

**Organization**: Tasks are grouped by user story. Because all files share one emitted module graph, implementation proceeds sequentially by slice even where inventory/document work can run independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with adjacent tasks because it changes independent files.
- **[Story]**: Maps the task to a user story in `spec.md`.
- Every implementation task names its concrete files or directory scope.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the 95-file scope measurable and create a reproducible mixed JS/TS build without changing the active production environment.

- [X] T001 Record all 95 tracked backend JavaScript paths, category, domain, slice and pending status in `specs/013-backend-typescript-migration/inventory.md`
- [X] T002 Add ignored build-output rules for `backend/dist/` in `.gitignore`
- [X] T003 Configure strict no-emit and mixed-state emit graphs in `backend/tsconfig.json` and `backend/tsconfig.build.json`
- [X] T004 Add reproducible build, compiled-test and compiled-start commands in `backend/package.json` without changing Timeweb or PM2
- [X] T005 Add a safe build cleanup wrapper scoped to `backend/dist/` in `backend/scripts/build-backend.sh`
- [X] T006 Run the mixed-state baseline through backend typecheck, compiled build, the complete backend suite and a plain-Node compiled app smoke check; record evidence in `specs/013-backend-typescript-migration/evidence.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared boundary types and guards required by every domain.

**⚠️ CRITICAL**: No domain migration starts before this phase passes the mixed-state gate.

- [X] T007 Define existing Express auth/request-id context through module augmentation in `backend/types/express.d.ts`
- [X] T008 [P] Add narrow reusable unknown/error guards without behavior changes in `backend/types/boundaries.ts`
- [X] T009 [P] Convert shared profile constants and pure validation/AI utility modules in `backend/constants/profile.constants.ts`, `backend/utils/validation.utils.ts`, `backend/utils/ai-date.utils.ts`, and `backend/utils/ai-errors.utils.ts`
- [X] T010 Convert shared logger and request/error middleware in `backend/lib/logger.ts`, `backend/middleware/request-id.middleware.ts`, and `backend/middleware/error.middleware.ts`
- [X] T011 Prove a known invalid boundary fails static checking and valid contracts compile in `backend/type-tests/contracts.type-test.ts`
- [X] T012 Verify foundation with backend typecheck/build, compiled `validation-utils`/`logger`/`app` tests and frontend typecheck; append evidence and rollback scope to `specs/013-backend-typescript-migration/evidence.md`

**Checkpoint**: Strict shared boundaries and compiled mixed-state execution are ready.

---

## Phase 3: User Story 1 — Ошибки границ обнаруживаются до запуска (Priority: P1) 🎯 MVP

**Goal**: Convert the high-fan-out data/auth foundations so invalid request, session, Prisma and entitlement assumptions fail during static checking.

**Independent Test**: Deliberately invalid type examples remain rejected by `npm run typecheck`; corrected auth/profile boundaries compile and their existing success/denial tests pass unchanged.

### Implementation and tests for User Story 1

- [X] T013 [US1] Convert the singleton data-access module in `backend/lib/prisma.ts`, preserving its single-client and TLS behavior
- [X] T014 [US1] Convert auth/session and credential services in `backend/services/auth/auth-session.service.ts` and `backend/services/auth/credentials.service.ts`
- [X] T015 [US1] Convert entitlement services in `backend/services/feature-entitlements.service.ts`, `backend/services/billing/plan-entitlements.service.ts`, and its colocated test `backend/services/billing/plan-entitlements.service.test.ts`
- [X] T016 [US1] Convert auth middleware and route in `backend/middleware/auth.middleware.ts` and `backend/routes/auth.routes.ts`, narrowing tokens and request bodies at existing boundaries
- [X] T017 [US1] Run backend typecheck/build plus compiled auth, middleware and entitlement tests; run frontend typecheck and record compatibility evidence in `specs/013-backend-typescript-migration/evidence.md`

**Checkpoint**: Auth, request context, entitlements and shared data access are strict and behavior-compatible.

---

## Phase 4: User Story 2 — Пользовательские сценарии остаются неизменными (Priority: P1)

**Goal**: Convert every remaining production domain while preserving all v2.9.0 request/response/error contracts and server-side authority.

**Independent Test**: Each domain passes its compiled success, validation, authorization and idempotency tests before the next domain starts; no supported consumer requires a change.

### Tasks slice

- [X] T018 [US2] Convert task services in `backend/services/tasks/task-completion.service.ts` and `backend/services/tasks/task-write.service.ts` without changing date or mutation semantics
- [X] T019 [US2] Convert task and subtask HTTP boundaries in `backend/routes/task.routes.ts` and `backend/routes/subtask.routes.ts`
- [X] T020 [US2] Verify tasks through backend typecheck/build and compiled task service/contract/time tests; run frontend typecheck and append evidence to `specs/013-backend-typescript-migration/evidence.md`

### AI slice

- [X] T021 [US2] Convert AI limits/provider/parser services and their colocated tests in `backend/services/ai/ai-limits.service.ts`, `backend/services/ai/ai-limits.service.test.ts`, `backend/services/ai/ai-provider.service.ts`, `backend/services/ai/ai-provider.service.test.ts`, `backend/services/ai/mind-hub-parser.service.ts`, and `backend/services/ai/mind-hub-parser.service.test.ts`
- [X] T022 [US2] Convert Mind Hub/read-only and draft tests/services in `backend/services/ai/mind-hub.service.ts`, `backend/services/ai/mind-hub-readonly.test.ts`, and `backend/services/ai/note-task-draft.service.test.ts`
- [X] T023 [US2] Convert AI/chat routes in `backend/routes/ai.routes.ts` and `backend/routes/chat.routes.ts`, keeping provider payloads unknown until validated and preserving explicit-confirmation behavior
- [X] T024 [US2] Verify AI with backend typecheck/build and all compiled AI contract, tone, provider, limit, parser and read-only tests; run frontend typecheck and append evidence to `specs/013-backend-typescript-migration/evidence.md`

### Payments slice

- [X] T025 [US2] Convert payment route in `backend/routes/payment.routes.ts`, preserving provider verification, amount/currency/metadata checks and webhook idempotency
- [X] T026 [US2] Verify payments with backend typecheck/build and compiled payment contract/feature-flag tests; run frontend typecheck and append evidence to `specs/013-backend-typescript-migration/evidence.md`

### Analytics, profile, notes and progress slice

- [X] T027 [US2] Convert profile/user route in `backend/routes/user.routes.ts` without changing user-facing text or preferences behavior
- [X] T028 [US2] Convert notes route and note-task draft service in `backend/routes/notes.routes.ts` and `backend/services/ai/note-task-draft.service.ts`, preserving explicit confirmation
- [X] T029 [US2] Convert progress services/routes in `backend/services/progress/achievements.service.ts`, `backend/services/progress/progress.service.ts`, and `backend/routes/progress.routes.ts`
- [X] T030 [US2] Convert analytics services/routes in `backend/services/analytics/ai-usage-accounting.service.ts`, `backend/services/analytics/analytics.service.ts`, and `backend/routes/analytics.routes.ts`
- [X] T031 [US2] Verify analytics/profile/notes/progress with backend typecheck/build and compiled user, notes, progress, analytics and accounting tests; run frontend typecheck and append evidence to `specs/013-backend-typescript-migration/evidence.md`

### Telegram slice and application entrypoints

- [X] T032 [US2] Convert Telegram API/catalog/link/URL helpers in `backend/services/telegram/telegram-api.client.ts`, `backend/services/telegram/telegram-command-catalog.ts`, `backend/services/telegram/telegram-link.service.ts`, and `backend/services/telegram/telegram-mini-app-url.service.ts`
- [X] T033 [US2] Convert Telegram Mini App auth/session services in `backend/services/telegram/telegram-mini-app-auth.service.ts` and `backend/services/telegram/telegram-mini-app-session.service.ts`, preserving backend initData verification
- [X] T034 [US2] Convert Telegram update/worker services in `backend/services/telegram/telegram-update.service.ts` and `backend/services/telegram/telegram-worker.service.ts`, keeping update payloads unknown until narrowed
- [X] T035 [US2] Convert Telegram route and webhook script in `backend/routes/telegram.routes.ts` and `backend/scripts/telegram-webhook.ts`
- [X] T036 [US2] Verify Telegram with backend typecheck/build and every compiled Telegram route, Mini App, API, link, update and worker test; run frontend typecheck and append evidence to `specs/013-backend-typescript-migration/evidence.md`
- [X] T037 [US2] Convert application composition/entrypoint in `backend/app.ts` and `backend/server.ts`, then validate `backend/dist/server.js` starts under plain Node without reading or changing production env

**Checkpoint**: All 46 runtime/support JavaScript files are TypeScript and all public domains retain their v2.9.0 behavior.

---

## Phase 5: User Story 3 — Миграция выполняется небольшими обратимыми срезами (Priority: P1)

**Goal**: Make the completed domain work independently verifiable and reversible without data rollback.

**Independent Test**: For every slice, its evidence names exact checks and a code-only rollback boundary; the mixed-state procedure has remained usable until the final runtime conversion.

- [X] T038 [US3] Audit each completed slice against `specs/013-backend-typescript-migration/contracts/migration-gates.md` and finalize per-slice check/rollback records in `specs/013-backend-typescript-migration/evidence.md`
- [X] T039 [US3] Document local compiled development, test, production build and code-only rollback commands in `backend/README.md` and `docs/architecture.md`
- [X] T040 [US3] Update deployment documentation for the future compiled entrypoint and explicit approval gate in `deploy/README.md` without changing Timeweb, PM2 or environment state

**Checkpoint**: Every migration slice has an auditable verification and rollback path.

---

## Phase 6: User Story 4 — Полнота миграции доказуема (Priority: P2)

**Goal**: Convert the complete test estate, eliminate hidden backend JavaScript and enforce the release inventory automatically.

**Independent Test**: The inventory gate reports 95/95 converted, fails if a new backend `.js` source appears, and the full release gate passes using compiled tests and entrypoint.

### Test-source conversion and final gate

- [X] T041 [US4] Convert shared backend test helpers in `backend/test/contract-test-helpers.ts` and `backend/test/telegram-test-helpers.ts`
- [X] T042 [US4] Convert exactly the `tests-core` paths enumerated in `specs/013-backend-typescript-migration/inventory.md` to `backend/test/*.test.ts` and resolve mocks with narrow structural types
- [X] T043 [US4] Convert exactly the `tests-telegram` paths enumerated in `specs/013-backend-typescript-migration/inventory.md` to `backend/test/telegram-*.test.ts`, preserving malformed fixtures without secrets or real initData
- [X] T044 [US4] Reconcile all 95 statuses and zero exceptions for core backend in `specs/013-backend-typescript-migration/inventory.md`
- [X] T045 [US4] Add an automatic zero-JavaScript/new-file release gate in `backend/scripts/check-typescript-inventory.sh` and wire it into `backend/package.json`
- [X] T046 [US4] Remove temporary mixed-JavaScript compiler allowances from `backend/tsconfig.json` and `backend/tsconfig.build.json`
- [X] T047 [US4] Run inventory, strict backend typecheck/build, all compiled backend tests and plain-Node entrypoint smoke; record final backend evidence in `specs/013-backend-typescript-migration/evidence.md`

**Checkpoint**: The backend source/test tree is fully TypeScript and completeness is mechanically enforced.

---

## Phase 7: Polish & Cross-Cutting Release Gate

**Purpose**: Validate repository-wide consumers and finish release documentation without deploying.

- [X] T048 Run root frontend `typecheck`, `lint`, unit tests and production build; record exact results in `specs/013-backend-typescript-migration/evidence.md`
- [X] T049 Run `npm run contracts:test` for auth/tasks/AI/payments plus `e2e/telegram-mini-app.spec.ts`; document any environment-limited Playwright checks in `specs/013-backend-typescript-migration/evidence.md`
- [X] T050 [P] Update v2.10.0 status, boundaries and subsequent `ai-proxy` follow-up in `docs/product-roadmap.md`
- [X] T051 [P] Add v2.10.0 implementation and rollback handoff in `docs/handoffs/PROJECT_HANDOFF_2026-09-01.md`
- [X] T052 Validate `specs/013-backend-typescript-migration/quickstart.md`, run `git diff --check`, confirm `src/pages/LandingPage.tsx` is untouched, and summarize release risks without push/deploy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** starts immediately.
- **Foundational (Phase 2)** depends on Setup and blocks domain migration.
- **US1 (Phase 3)** depends on Foundational and establishes typed auth/data boundaries.
- **US2 (Phase 4)** depends on US1 because all domains reuse auth, request context, entitlements and Prisma.
- **US3 (Phase 5)** audits the actual completed slices from US1/US2.
- **US4 (Phase 6)** depends on all runtime slices so tests can be converted against the final module graph.
- **Polish (Phase 7)** depends on US1–US4 and is the release gate.

### User Story Dependencies

```text
Setup → Foundation → US1 → US2 → US3 → US4 → Release Gate
```

- **US1** is the MVP proof that strict boundaries catch defects before runtime.
- **US2** delivers behavior-compatible runtime completeness and necessarily uses US1 foundations.
- **US3** is independently inspectable but finalized after real slices exist.
- **US4** proves completeness and includes all test sources after runtime paths stabilize.

### Within Each Domain Slice

1. Inspect source, imports, consumers and existing tests.
2. Convert service/pure modules before routes or entrypoints.
3. Narrow external payloads; do not add behavior.
4. Compile before running focused compiled tests.
5. Record evidence and rollback boundary before the next slice.

## Parallel Opportunities

- T008 and T009 can proceed independently after compiler setup.
- T050 and T051 are parallel documentation tasks after the final gate.
- Static inventory review can run alongside read-only code inspection, but source conversion is deliberately sequential to keep failures attributable.
- Within a slice, read-only inspection of tests and consumers may run in parallel; edits to the shared module graph should not.

## Parallel Example: Foundation

```text
Task T008: Add `backend/types/boundaries.ts` unknown/error guards.
Task T009: Convert pure constants/utilities under `backend/constants` and `backend/utils`.
```

## Parallel Example: Release Documentation

```text
Task T050: Update `docs/product-roadmap.md`.
Task T051: Create `docs/handoffs/PROJECT_HANDOFF_2026-09-01.md`.
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 auth/data boundary slice.
3. Stop and validate that a known invalid boundary fails static checking while existing auth/profile scenarios pass.
4. Continue only with a green mixed-state build and compiled test runner.

### Incremental Delivery

1. Foundation: reproducible mixed build and boundary vocabulary.
2. US1: shared data/auth/entitlements.
3. US2: tasks → notes/progress/analytics → AI → payments → Telegram → entrypoints.
4. US3: finalize evidence and rollback documentation.
5. US4: migrate test sources, remove mixed-state allowances and enforce inventory.
6. Release gate: frontend consumers, critical smoke paths and documentation.

### Safety Rules

- No production deploy, PM2 change, migration, DB/env access or push is part of these tasks.
- `src/pages/LandingPage.tsx` remains untouched.
- `ai-proxy/server.js` remains outside v2.10.0 and is not renamed.
- Do not create commits unless the user requests them; keep each working slice logically isolated in the diff and evidence.
