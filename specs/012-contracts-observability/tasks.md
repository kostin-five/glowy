---

description: "Dependency-ordered implementation tasks for Glowy v2.9.0"

---

# Tasks: v2.9.0 — Типы, контракты и наблюдаемость

**Input**: Design documents from `/specs/012-contracts-observability/`

**Tests**: Contract, concurrency, redaction, provider and responsive tests are required by the specification.

**Organization**: AI is the first complete vertical slice. Auth, tasks and payments follow as
separate contract slices. Analytics/profile/notes/Telegram are inventory-only except where they
consume the shared AI limit/provider path.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May run in parallel because it changes separate files after its declared prerequisites.
- **[Story]**: Maps to a user story in `spec.md`.

## Phase 1: Setup — Shared contract and TypeScript foundation

**Purpose**: Add one buildable shared contract source without changing runtime behavior.

- [x] T001 Create the internal ESM contract package skeleton and exports in `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, and `packages/contracts/src/index.ts`
- [x] T002 Add Zod/TypeScript contract-package dependencies and reproducible scripts in `package.json`, `package-lock.json`, `backend/package.json`, and `backend/package-lock.json`
- [x] T003 Configure incremental mixed JS/TS backend checking without renaming existing routes in `backend/tsconfig.json` and `backend/package.json`
- [x] T004 Wire contract build and backend typecheck into existing CI order in `.github/workflows/ci.yml`

**Checkpoint**: Shared package builds, current backend still starts from the existing source entrypoint, and no behavior changed.

---

## Phase 2: Foundational — Contract test utilities and inventory guard

**Purpose**: Establish reusable primitives that block contract slices.

- [x] T005 [P] Define shared additive error/request-ID primitives and safe validation-detail rules in `packages/contracts/src/common.ts`
- [x] T006 [P] Define shared date, identifier, pagination-free list, and enum primitives used by the four critical domains in `packages/contracts/src/primitives.ts`
- [x] T007 Add backend contract-test helpers for auth injection, response parsing, and provider spies in `backend/test/contract-test-helpers.js`
- [x] T008 Add a route-inventory drift test that compares mounted operations with the 52-operation baseline in `backend/test/endpoint-inventory.test.js` and `specs/012-contracts-observability/contracts/endpoint-inventory.md`
- [x] T009 Document slice-level build, rollout, and source-entrypoint rollback rules in `specs/012-contracts-observability/quickstart.md`

**Checkpoint**: Foundation is green and detects an undocumented route before user-story work starts.

---

## Phase 3: User Story 1 — AI только для зарегистрированного пользователя (Priority: P1) 🎯 First slice

**Goal**: Remove direct unauthenticated AI spending while preserving authenticated Mind Hub behavior.

**Independent Test**: Public/guest calls cannot reach a provider; authenticated calls still return compatible drafts/reply/limit and never mutate tasks before confirmation.

### Tests for User Story 1

- [x] T010 [P] [US1] Add failing HTTP tests for 401 authenticated Mind Hub and removed `/mind-hub/public` in `backend/test/ai-contract-routes.test.js`
- [x] T011 [P] [US1] Add failing frontend tests proving stale guest state sends no AI network request and receives a registration message in `src/api/AiApi.analytics.test.ts`
- [x] T012 [P] [US1] Add contract fixtures for valid Mind Hub requests, success, limit and provider fallback responses in `packages/contracts/test/ai.contract.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Define shared AI usage, Mind Hub request/response/draft and error schemas in `packages/contracts/src/ai.ts` and export them from `packages/contracts/src/index.ts`
- [x] T014 [US1] Remove the public Mind Hub route and its in-memory limiter while retaining auth before all AI operations in `backend/routes/ai.routes.js`
- [x] T015 [US1] Validate authenticated Mind Hub boundary data, compatible responses, and additive request-ID errors with shared contracts in `backend/routes/ai.routes.js`
- [x] T016 [US1] Replace the frontend guest network branch with a Russian registration-required result and parse authenticated responses through shared contracts in `src/api/AiApi.ts`
- [x] T017 [US1] Verify AI draft confirmation remains explicit, then run focused AI backend tests, `npm run typecheck`, focused frontend tests, lint, and build for `src/components/mind/MindHubChat.test.tsx` and `backend/services/ai/mind-hub-readonly.test.js`

**Checkpoint**: The AI domain has no unauthenticated provider path and remains independently usable by an authenticated web/Telegram session.

---

## Phase 4: User Story 2 — Атомарный AI-лимит (Priority: P1)

**Goal**: Prevent concurrent web, notes, analytics and Telegram requests from exceeding a user's remaining quota.

**Independent Test**: With one remaining unit, 20 concurrent reservations allow exactly one; provider failure releases only its own reservation in the same window.

### Tests for User Story 2

- [x] T018 [P] [US2] Add failing deterministic 20-request concurrency and same-window release tests in `backend/services/ai/ai-limits.service.test.js`
- [x] T019 [P] [US2] Add failing route tests proving denied reservations skip the provider and provider failure releases quota in `backend/test/ai-contract-routes.test.js`, `backend/test/analytics-routes.test.js`, and `backend/test/notes-routes.test.js`
- [x] T020 [P] [US2] Add failing Telegram worker tests for the same reservation semantics in `backend/test/telegram-worker-ai.test.js`

### Implementation for User Story 2

- [x] T021 [US2] Implement injectable atomic reserve/read/release operations over existing User fields through `backend/lib/prisma.js` in `backend/services/ai/ai-limits.service.js`
- [x] T022 [US2] Reserve before provider work and release expected failures in `backend/routes/ai.routes.js`
- [x] T023 [P] [US2] Adopt the reservation API for analytics and note AI operations in `backend/routes/analytics.routes.js` and `backend/routes/notes.routes.js`
- [x] T024 [P] [US2] Adopt the reservation API for bot AI commands without changing confirmation semantics in `backend/services/telegram/telegram-worker.service.js`
- [x] T025 [US2] Remove obsolete preview-then-consume exports/usages, verify one canonical limit path, then run AI/analytics/notes/Telegram backend tests and frontend typecheck in `backend/services/ai/ai-limits.service.js` and its consumers

**Checkpoint**: All AI entrypoints share one atomic backend limit authority and concurrency tests pass without a schema change.

---

## Phase 5: User Story 3 — Проверяемые критические контракты (Priority: P1)

**Goal**: Make AI, auth, tasks and payments contracts machine-verifiable while preserving existing consumers.

**Independent Test**: Valid, invalid, unauthenticated and domain-error fixtures parse consistently on both sides; old supported consumers remain green.

### Auth slice

- [x] T026 [P] [US3] Add failing auth contract fixtures and HTTP tests in `packages/contracts/test/auth.contract.test.ts` and `backend/test/auth-routes.test.js`
- [x] T027 [US3] Define SafeUser, register/login/logout/me and auth error schemas in `packages/contracts/src/auth.ts`
- [x] T028 [US3] Adopt auth request/response contracts and additive request-ID errors without changing cookie/session policy in `backend/routes/auth.routes.js`
- [x] T029 [US3] Parse auth responses with shared schemas, preserve Login/Register/store behavior, then run auth backend tests, frontend auth tests, typecheck, lint, and build in `src/api/AuthApi.ts` and `src/store/useAuthStore.test.ts`

### Tasks slice

- [x] T030 [P] [US3] Add failing task/subtask contract fixtures for date, completion, ownership and update envelope cases in `packages/contracts/test/tasks.contract.test.ts` and `backend/test/task-contract-routes.test.js`
- [x] T031 [US3] Define Task, TaskDraft, TaskUpdateResult, SubTask and validation-error schemas in `packages/contracts/src/tasks.ts`
- [x] T032 [US3] Adopt shared task contracts and additive request-ID errors at HTTP boundaries without changing task service behavior in `backend/routes/task.routes.js` and `backend/routes/subtask.routes.js`
- [x] T033 [US3] Replace local casts/parsers with shared task contracts in `src/api/TaskApi.ts`, `src/api/SubTaskApi.ts`, and `src/types/index.ts`
- [x] T034 [US3] Verify offline queue/reconciliation compatibility, then run task/subtask backend tests, offline/store frontend tests, typecheck, lint, and build in `src/offline/taskOfflineSync.test.ts` and `src/store/useTaskStore.test.ts`

### Payments slice

- [x] T035 [P] [US3] Add failing payment contract fixtures for plan state, checkout, unavailable plan, rate limit and webhook acknowledgement in `packages/contracts/test/payments.contract.test.ts` and `backend/test/payment-contract-routes.test.js`
- [x] T036 [US3] Define payment plan, checkout, webhook acknowledgement and stable payment error schemas in `packages/contracts/src/payments.ts`
- [x] T037 [US3] Adopt payment contracts and additive request-ID errors while retaining provider verification, amount/currency/metadata checks and idempotency in `backend/routes/payment.routes.js`
- [x] T038 [US3] Parse current-plan and Focus checkout responses through shared contracts, preserve UI behavior, then run payment backend/frontend tests, typecheck, lint, and build in `src/api/PaymentApi.ts` and `src/pages/PricingPage.test.tsx`

**Checkpoint**: Four critical domains use shared schemas and their existing public success fields remain compatible.

---

## Phase 6: User Story 4 — Безопасная расследуемость (Priority: P2)

**Goal**: Correlate failures by request ID and operational fields without logging private content.

**Independent Test**: Seeded secrets/private texts are absent from captured logs; handled and unhandled errors are traceable by request ID.

### Tests for User Story 4

- [x] T039 [P] [US4] Add failing recursive redaction/allowlist tests with seeded password, token, email, initData, task, note and AI text in `backend/test/logger.test.js`
- [x] T040 [P] [US4] Add failing request lifecycle and error-envelope correlation tests in `backend/test/app.test.js`

### Implementation for User Story 4

- [x] T041 [US4] Implement safe structured context sanitization and stable operational fields in `backend/lib/logger.js`
- [x] T042 [US4] Add request completion logging with method, route template, status and duration in `backend/middleware/request-id.middleware.js`
- [x] T043 [US4] Include request ID in safe unhandled error bodies without stack/internal details in `backend/middleware/error.middleware.js`
- [x] T044 [US4] Add a reusable safe request-ID error-envelope adapter for migrated routes in `backend/middleware/error.middleware.js`
- [x] T045 [US4] Verify provider/accounting/payment/Telegram structured events pass only safe context, then run logger/app/domain backend tests in `backend/services/` and `backend/routes/`

**Checkpoint**: Every tested failure is correlatable and no seeded sensitive value appears in logs.

---

## Phase 7: User Story 5 — Управляемые сбои AI provider (Priority: P2)

**Goal**: Bound total provider latency and stop multiplying requests during a retryable outage.

**Independent Test**: Primary+fallback share one deadline; three retryable failures open the circuit; one successful half-open probe restores service.

### Tests for User Story 5

- [x] T046 [P] [US5] Add failing deterministic total-budget tests for primary and fallback calls in `backend/services/ai/ai-provider.service.test.js`
- [x] T047 [P] [US5] Add failing closed/open/half-open circuit transition tests with injected clock in `backend/services/ai/ai-provider.service.test.js`
- [x] T048 [P] [US5] Add route-level graceful Russian fallback tests with no task mutation and released quota in `backend/test/ai-contract-routes.test.js`

### Implementation for User Story 5

- [x] T049 [US5] Propagate one remaining timeout budget through direct primary/fallback/provider requests in `backend/services/ai/ai-provider.service.js`
- [x] T050 [US5] Implement a three-failure, 30-second, single-probe in-process circuit breaker in `backend/services/ai/ai-provider.service.js`
- [x] T051 [US5] Emit safe provider state/completion metrics without prompts or payloads, then run provider and AI route tests plus frontend typecheck in `backend/services/ai/ai-provider.service.js` and `backend/lib/logger.js`

**Checkpoint**: Provider outage behavior is fast, bounded, observable and independently testable.

---

## Phase 8: User Story 6 — Спокойная Главная (Priority: P3)

**Goal**: Ship the agreed Dashboard simplification as part of v2.9.0.

**Independent Test**: Desktop order is Today → Mind Hub → full-height Focus; mobile remains Focus → Energy → Today; AI task confirmation still persists tasks.

- [x] T052 [P] [US6] Verify and finalize removal of the recent-AI ID reader/block and responsive desktop/mobile composition in `src/pages/DashboardPage.tsx`
- [x] T053 [P] [US6] Verify and finalize removal of the now-unused recent-AI ID writer without changing task creation in `src/components/mind/MindHubChat.tsx`
- [x] T054 [US6] Keep responsive order/absence and Mind Hub confirmation tests green, then run focused tests, frontend typecheck, lint, and build in `src/pages/DashboardPage.test.tsx` and `src/components/mind/MindHubChat.test.tsx`

**Checkpoint**: Dashboard requirements pass independently; `src/pages/LandingPage.tsx` remains untouched.

---

## Phase 9: Polish, documentation and release evidence

**Purpose**: Prove the integrated release locally/dev without performing production actions.

- [x] T055 [P] Update architecture and local contract/typecheck guidance in `docs/architecture.md` and `README.md` without adding configuration or changing values
- [x] T056 [P] Update v2.9.0 progress, slice boundaries and rollback notes without marking production release complete in `docs/product-roadmap.md` and `docs/handoffs/DEVELOPER_ONBOARDING.md`
- [x] T057 Run contract package build/tests and full backend typecheck/test suite from `packages/contracts/package.json` and `backend/package.json`
- [x] T058 Run frontend `typecheck`, `lint`, full unit tests and production build from root `package.json`
- [x] T059 Run existing local/dev Playwright auth/tasks scenarios from `playwright.config.ts` and record any environment-only gaps in `specs/012-contracts-observability/quickstart.md`
- [x] T060 Audit final diff for a single Prisma client, route inventory drift, secret/private-text logging, LandingPage exclusion and absent migration/env/production changes in `specs/012-contracts-observability/quickstart.md`

---

## Dependencies & Execution Order

### Phase dependencies

- Setup T001–T004 → Foundational T005–T009.
- US1 depends on Foundation and is the first mandatory vertical slice.
- US2 depends on US1 contracts/auth boundary and must finish before any other AI consumer ships.
- US3 depends on shared package foundation; auth/tasks/payments sub-slices execute sequentially and each has its own checkpoint.
- US4 depends on common error primitives but may be developed after US1/US2 without blocking contract fixtures.
- US5 depends on US2 reservation/release semantics so provider failures can refund safely.
- US6 is code-independent from backend slices but remains part of integrated release evidence.
- Polish depends on all selected user stories.

### Parallel opportunities

- T005 and T006; contract test fixtures for different domains; redaction and request lifecycle tests;
  provider budget and circuit tests; Dashboard and Mind Hub dead-tracking verification.
- Parallel markers never authorize simultaneous edits to the same file.

## Parallel Example: AI-first slice

```text
T010 backend unauthenticated route tests
T011 frontend stale guest/no-network tests
T012 shared AI contract fixtures
```

After those fail for the expected reasons, execute T013 → T014/T015 → T016 → T017 and stop at
the US1 checkpoint before touching quota behavior.

## Implementation Strategy

1. Build the shared foundation without runtime behavior changes.
2. Complete and verify US1: close public AI.
3. Complete and verify US2: atomic quota across every AI consumer.
4. Complete contract slices auth → tasks → payments, verifying each independently.
5. Add observability, then provider resilience, each with focused tests.
6. Confirm the already-started Dashboard slice as part of the same version.
7. Run integrated release evidence. Do not push, deploy, restart services, inspect production
   logs or change production configuration without a new explicit user instruction.

## Phase 10: Convergence

- [x] T061 Complete the existing T059 browser evidence by running `npm run test:e2e` after the local Chromium/preview execution restriction clears, fix any relevant failures, and record the final result in `specs/012-contracts-observability/quickstart.md` per SC-009 and Constitution IV (partial)
