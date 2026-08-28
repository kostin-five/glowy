# Tasks: Поведенческие режимы и честный прогресс

**Input**: Design documents from `specs/009-behavior-modes-progress/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Business rules, API compatibility, offline/Telegram parity and mobile UI require focused automated tests before implementation.

**Organization**: Tasks are grouped by user story. P1 stories are implemented before P2 presentation work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel in a different file after its phase prerequisites
- **[Story]**: Maps to the numbered user story in spec.md

## Phase 1: Setup and Baseline

**Purpose**: Preserve the green CI baseline and establish explicit scope boundaries.

- [ ] T001 Record the current unit/build/Playwright baseline and PWA CI fix commit in `specs/009-behavior-modes-progress/quickstart.md`
- [ ] T002 Verify `backend/prisma/schema.prisma` has no feature diff and record a successful `prisma validate` no-migration guard in `specs/009-behavior-modes-progress/quickstart.md`
- [ ] T003 Confirm `src/pages/LandingPage.tsx` has no feature diff and keep landing regression coverage in `e2e/landing.smoke.spec.ts`

---

## Phase 2: Foundational Contracts

**Purpose**: Add compatible shared shapes used by XP and calendar stories.

**⚠️ CRITICAL**: Complete before US2 or US4.

- [X] T004 [P] Extend task completion response types with signed XP outcome in `src/api/TaskApi.ts` and `src/types/index.ts`
- [ ] T005 [P] Extend progress overview types with bounded calendar fields in `src/types/index.ts`
- [X] T006 Add behavior-aware completion result state and safe reason mapping to `src/store/useTaskStore.ts`
- [ ] T007 Add schema compatibility tests for XP outcome and calendar parsing in `src/types/index.test.ts`

**Checkpoint**: Existing responses still parse; additive fields have validated frontend contracts.

---

## Phase 3: User Story 1 - Выбрать понятный режим поведения (Priority: P1) 🎯 MVP

**Goal**: Make calm, moderate and strict behavior visibly and functionally distinct while preserving safe language.

**Independent Test**: Select each mode and validate settings copy plus three different instructions/replies for the same missed-task fixture.

### Tests for User Story 1

- [X] T008 [P] [US1] Add calm/moderate/strict instruction and prohibited-language assertions in `backend/test/ai-tone.test.js`
- [X] T009 [P] [US1] Add tone-specific analytics prompt assertions in `backend/test/analytics-service.test.js`
- [X] T010 [P] [US1] Add settings labels, default marker and consequence copy tests in `src/pages/SettingsPage.profile.test.tsx`
- [ ] T011 [P] [US1] Add an automated profile-save scenario that observes the confirmed mode within 3 seconds in `e2e/personal-progress.smoke.spec.ts`

### Implementation for User Story 1

- [X] T012 [US1] Strengthen behavior instructions and remove unconditional warm/friend wording from tone-dependent prompts in `backend/services/ai/mind-hub.service.js`
- [X] T013 [P] [US1] Align analytics insight behavior instructions in `backend/services/analytics/analytics.service.js`
- [X] T014 [US1] Rename user-facing tone selection to behavior guidance, mark calm as default and explain mode consequences in `src/constants/profile.ts` and `src/components/profile/ProfilePreferencesPanel.tsx`

**Checkpoint**: Each mode is independently distinguishable and reversible; unsafe strict copy is prohibited by tests.

---

## Phase 4: User Story 2 - Получать XP по выбранным правилам (Priority: P1)

**Goal**: Apply one idempotent XP policy across HTTP, offline sync and Telegram.

**Independent Test**: Run the full mode × overdue matrix twice through service/HTTP/Telegram fixtures and verify the signed delta and level.

### Tests for User Story 2

- [X] T015 [P] [US2] Add pure calm/moderate/strict, clamp, self-overdue and replay cases in `backend/test/task-completion-service.test.js`
- [ ] T016 [P] [US2] Add HTTP completion response and overdue ownership cases in `backend/test/task-behavior.test.js`
- [X] T017 [P] [US2] Add Telegram +XP/0 XP/-XP and replay cases in `backend/test/telegram-worker-done.test.js`
- [X] T018 [P] [US2] Add optimistic/offline reconciliation cases in `src/store/useTaskStore.behavior.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Implement the signed behavior-mode XP policy and safe outcome codes in `backend/services/tasks/task-completion.service.js`
- [X] T020 [US2] Use the shared policy, user-scoped overdue query and resulting progress in `backend/routes/task.routes.js`
- [X] T021 [US2] Use the same shared policy and concise Russian outcome messages in `backend/services/telegram/telegram-worker.service.js`
- [X] T022 [US2] Reconcile signed/withheld completion outcomes and expose a transient explanation in `src/store/useTaskStore.ts` and `src/components/tasks/TaskList.tsx`
- [X] T023 [US2] Preserve one queued mutation and server-authoritative XP in `src/offline/taskOfflineSync.ts`
- [ ] T024 [US2] Add HTTP/offline/Telegram parity scenarios to `e2e/offline.spec.ts`

**Checkpoint**: The same completion produces the same durable XP exactly once in every channel.

---

## Phase 5: User Story 5 - Спасти только вчерашний разрыв (Priority: P1)

**Goal**: Restrict rescue eligibility and mutation to yesterday after a real preceding streak.

**Independent Test**: Exercise yesterday eligible, no prior streak, old gap, duplicate and exhausted limit fixtures.

### Tests for User Story 5

- [ ] T025 [P] [US5] Replace arbitrary historical-gap expectations with yesterday-only eligibility cases in `backend/test/progress-service.test.js`
- [ ] T026 [P] [US5] Add direct API rejection for old/today/future dates and idempotent yesterday cases in `backend/test/progress-routes.test.js`

### Implementation for User Story 5

- [ ] T027 [US5] Replace historical gap search with exact yesterday/day-before-yesterday policy in `backend/services/progress/progress.service.js`
- [ ] T028 [US5] Enforce yesterday-only rescue inside the existing transaction and return safe Russian errors in `backend/routes/progress.routes.js`
- [ ] T029 [US5] Update rescue explanation and confirmation copy in `src/components/progress/StreakPanel.tsx`

**Checkpoint**: No past date other than yesterday can consume a rescue through UI or direct API.

---

## Phase 6: User Story 3 - Сразу видеть срок и плановую длительность (Priority: P2)

**Goal**: Show estimated duration and strict overdue styling directly on task cards.

**Independent Test**: Render dated/undated/completed tasks with and without duration in each mode at mobile and desktop widths.

### Tests for User Story 3

- [ ] T030 [P] [US3] Add behavior-aware overdue and duration formatting unit cases in `src/utils/behaviorMode.test.ts`
- [ ] T031 [P] [US3] Add TaskItem light/dark rendering and accessibility cases in `src/components/tasks/TaskItem.test.tsx`

### Implementation for User Story 3

- [ ] T032 [US3] Implement pure mode-aware overdue and duration helpers in `src/utils/behaviorMode.ts`
- [ ] T033 [US3] Add the duration chip and strict-only red overdue date to `src/components/tasks/TaskItem.tsx`
- [ ] T034 [US3] Add mobile task-card regression to `e2e/personal-progress.smoke.spec.ts`

**Checkpoint**: Time and strict overdue state are visible without opening the editor and do not crowd 320 px cards.

---

## Phase 7: User Story 4 - Понимать стрик по календарю (Priority: P2)

**Goal**: Replace the linear streak strip with an original monthly «Карта ритма».

**Independent Test**: Open current and past months with boundary fixtures and verify all states and 320 px layout.

### Tests for User Story 4

- [ ] T035 [P] [US4] Add Monday-grid, leap-year, state-priority and future-month cases in `backend/test/progress-service.test.js`
- [ ] T036 [P] [US4] Add optional month validation and ownership-bounded response cases in `backend/test/progress-routes.test.js`
- [ ] T037 [P] [US4] Add calendar schema/API month parameter tests in `src/api/ProgressApi.test.ts`
- [ ] T038 [P] [US4] Add calendar navigation, legend, explicit rescue confirmation and 320 px rendering tests in `src/components/progress/StreakPanel.test.tsx`

### Implementation for User Story 4

- [ ] T039 [US4] Build the bounded monthly rhythm calendar and state precedence in `backend/services/progress/progress.service.js`
- [ ] T040 [US4] Validate `month`, include calendar in overview and preserve existing response fields in `backend/routes/progress.routes.js`
- [ ] T041 [US4] Send selected month and parse the additive calendar contract in `src/api/ProgressApi.ts` and `src/types/index.ts`
- [ ] T042 [US4] Implement seven-column «Карта ритма», month navigation and accessible legend in `src/components/progress/StreakPanel.tsx`
- [ ] T043 [US4] Keep selected month and reload overview safely in `src/pages/SuccessStairsPage.tsx`
- [ ] T044 [US4] Add 320/360/390/430 month-grid Playwright coverage in `e2e/personal-progress.smoke.spec.ts`

**Checkpoint**: The calendar explains the streak across months without horizontal scrolling or confusing rescue with completion.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verify compatibility, documentation and release safety across all stories.

- [ ] T045 [P] Update public behavior, XP, calendar and no-migration boundaries in `README.md`, `docs/product-roadmap.md` and `docs/architecture.md`
- [ ] T046 [P] Add final behavior/XP/rescue/manual device matrix to `specs/009-behavior-modes-progress/quickstart.md`
- [ ] T047 Run Prisma validate and complete backend test suite from `backend/`
- [ ] T048 Run frontend typecheck, lint, full Vitest suite and production build from repository root
- [ ] T049 Run full Playwright suite in CI mode and verify `src/pages/LandingPage.tsx` remains unchanged
- [ ] T050 Perform a manual dev smoke for settings, AI, web/offline task completion, Telegram completion and 320 px calendar; record any unavailable real-environment checks in `specs/009-behavior-modes-progress/quickstart.md`
- [ ] T051 Run `git diff --check`, inspect secrets/logging boundaries and create focused feature commits

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup** → **Foundational Contracts**.
- **US1** starts after Setup and can proceed independently of XP/calendar.
- **US2** depends on Foundational Contracts.
- **US5** can proceed after Setup and should finish before calendar UI.
- **US3** depends only on US1 mode semantics.
- **US4** depends on Foundational Contracts and US5 rescue semantics.
- **Polish** depends on all selected stories.

### User Story Dependencies

```text
US1 ───────> US3
US2 ───────────────┐
US5 ───────> US4  ├─> Polish
Foundation ─> US2 ┤
Foundation ─> US4 ┘
```

### Parallel Opportunities

- US1 backend prompt tests and frontend settings tests can run in parallel.
- US2 service, Telegram and frontend offline tests can be written in parallel before implementation.
- US5 tests can run alongside US1 after Setup.
- US3 TaskItem tests and US4 backend calendar tests touch separate domains.
- Documentation and quickstart record can proceed in parallel during final verification.

## Parallel Example: User Story 2

```text
Task T015: backend completion policy tests
Task T017: Telegram completion outcome tests
Task T018: frontend offline reconciliation tests
```

## Implementation Strategy

### MVP First

1. Complete Setup.
2. Deliver US1 so the three modes are actually distinct.
3. Deliver US2 and US5 so saved progress follows the selected mode and rescue rule.
4. Validate all P1 stories before presentation work.

### Incremental Delivery

1. CI bugfix is already isolated in commit `604d064`.
2. Commit Spec Kit artifacts separately.
3. Commit behavior copy/AI, XP policy, rescue policy, task-card UI and calendar UI as focused groups.
4. Run full regression before any merge to `dev`.

## Notes

- Do not create or apply a migration for this feature.
- Do not change production DB, env, infrastructure or `src/pages/LandingPage.tsx`.
- User-facing copy remains Russian; strict means disciplined and direct, never abusive.
- Every first completion is policy-evaluated once; `xpAwarded` remains the replay guard.
