# Tasks: Мобильная полировка и устойчивые отчёты

**Input**: `specs/010-mobile-ui-report-polish/`

**Tests**: Требуются unit/render/e2e и ручная проверка физического телефона.

## Phase 1: Setup and Guards

- [X] T001 Record current git status and automated baseline in `specs/010-mobile-ui-report-polish/quickstart.md`
- [X] T002 Verify no diff in `src/pages/LandingPage.tsx` and `backend/prisma/schema.prisma`
- [X] T003 [P] Add exact current unit-economics/admin scope notes to `specs/010-mobile-ui-report-polish/quickstart.md`

## Phase 2: Foundational Presentation and Storage

- [X] T004 [P] Extract shared task presentation helpers in `src/utils/taskCardPresentation.ts`
- [X] T005 [P] Add owner/period-scoped report read/write/delete helpers in `src/utils/analyticsReportStorage.ts`
- [X] T006 [P] Add safe headings/lists/bold parser component in `src/components/analytics/SafeReportMarkdown.tsx`
- [X] T007 [P] Add helper tests in `src/utils/taskCardPresentation.test.ts`, `src/utils/analyticsReportStorage.test.ts` and `src/components/analytics/SafeReportMarkdown.test.tsx`

## Phase 3: User Story 1 - Компактная Главная (P1)

**Goal**: compact Main with familiar read-only task summaries.

**Independent Test**: task sections render metadata/subtask counts and expose no mutation control.

- [X] T008 [P] [US1] Add read-only card accessibility and no-mutation tests in `src/components/tasks/ReadOnlyTaskCard.test.tsx`
- [X] T009 [US1] Create visually aligned read-only task card in `src/components/tasks/ReadOnlyTaskCard.tsx`
- [X] T010 [US1] Replace dashboard mini rows and remove excessive height/gaps in `src/pages/DashboardPage.tsx`
- [X] T011 [US1] Rename dashboard navigation text to «Главная» in `src/components/layout/Sidebar.tsx` and `src/pages/SettingsPage.tsx`
- [X] T012 [US1] Add Dashboard render/mobile regression in `src/pages/DashboardPage.test.tsx` and `e2e/mobile-ui-polish.spec.ts`

## Phase 4: User Story 2 - Надёжная мобильная оболочка (P1)

**Goal**: real-device orb animation and collision-free shell.

**Independent Test**: mobile widths have no overlap/scroll; collapsed routes are absent; animation is active unless reduced-motion.

- [X] T013 [P] [US2] Add orb animation and reduced-motion assertions in `src/components/layout/GlowyAiOrb.test.tsx`
- [X] T014 [P] [US2] Add collapsed/expanded sidebar interaction tests in `src/components/layout/Sidebar.test.tsx`
- [X] T015 [US2] Implement Safari-safe named orb animation in `src/components/layout/GlowyAiOrb.tsx` and `src/index.css`
- [X] T016 [US2] Remove route navigation from collapsed sidebar and enlarge logo in `src/components/layout/Sidebar.tsx`
- [X] T017 [US2] Reserve desktop collapse-control space in page chat header in `src/components/mind/MindHubChat.tsx`
- [X] T018 [US2] Keep task heading one line and shell spacing compact in `src/pages/TaskPage.tsx`
- [X] T019 [US2] Add 320/360/390/430 shell, chat and sidebar Playwright coverage in `e2e/mobile-ui-polish.spec.ts`

## Phase 5: User Story 3 - Массовый перенос задач (P1)

**Goal**: complete/delete/reschedule selected tasks with honest partial results.

**Independent Test**: tomorrow/custom date update existing tasks and failed ids remain selected.

- [X] T020 [P] [US3] Add local tomorrow/date and partial-result tests in `src/components/tasks/TaskList.bulk.test.tsx`
- [X] T021 [US3] Replace «Снять» with tomorrow/custom-date actions and accessible date dialog in `src/components/tasks/TaskList.tsx`
- [X] T022 [US3] Preserve failed selection and show Russian bulk result in `src/components/tasks/TaskList.tsx`
- [X] T023 [US3] Make all task filter labels/counts visible at 320 px in `src/components/tasks/TaskFilter.tsx`
- [X] T024 [US3] Add bulk move and filter visibility Playwright flow in `e2e/mobile-ui-polish.spec.ts`

## Phase 6: User Story 4 - Устойчивый глубокий отчёт (P1)

**Goal**: safe formatted, copyable and persisted AI report.

**Independent Test**: report restores per owner/period, copies, deletes and survives failed regeneration.

- [X] T025 [P] [US4] Add Analytics report restore/copy/delete/regenerate tests in `src/pages/AnalyticsPage.test.tsx`
- [X] T026 [US4] Restore/save owner-period report around existing Analytics API flow in `src/pages/AnalyticsPage.tsx`
- [X] T027 [US4] Render safe formatted report and add copy feedback in `src/pages/AnalyticsPage.tsx`
- [X] T028 [US4] Add explicit delete/new-report confirmation while retaining old result on error in `src/pages/AnalyticsPage.tsx`
- [X] T029 [US4] Add route/reload/account-isolation report Playwright flow in `e2e/mobile-ui-polish.spec.ts`

## Phase 7: User Story 5 - Forever preview (P2)

**Goal**: disable public lifetime acquisition without changing Founder entitlements.

**Independent Test**: Pricing shows Forever/Скоро and never calls activation; existing Founder stays active.

- [X] T030 [P] [US5] Update pricing smoke assertions for Forever and zero activation calls in `e2e/pricing.smoke.spec.ts`
- [X] T031 [P] [US5] Add existing-Founder presentation test in `src/pages/PricingPage.test.tsx`
- [X] T032 [US5] Remove query/click auto activation and render disabled Forever preview in `src/pages/PricingPage.tsx`

## Phase 8: User Story 6 - Operations roadmap (P3)

**Goal**: explain current AI costs and admin timing without building admin.

**Independent Test**: docs contain safe per-request/per-user queries and retain admin at v3.8.0.

- [X] T033 [P] [US6] Document per-request and per-user/day formulas and query examples in `docs/ai-unit-economics.md`
- [X] T034 [P] [US6] Reconcile Forever presentation and admin v3.8 scope in `docs/product-roadmap.md`
- [X] T035 [US6] Update frontend-only storage/pricing boundaries in `docs/architecture.md`

## Phase 9: Polish and Verification

- [X] T036 Run focused Vitest and Playwright suites for every user story
- [X] T037 Run full frontend typecheck, lint, Vitest and production build
- [X] T038 Run complete backend test suite and Prisma validate without migration
- [X] T039 Run full Playwright desktop/mobile suite
- [X] T040 Confirm LandingPage, Prisma schema, backend Founder implementation and PaymentApi activation method have no feature diff
- [X] T041 Record unavailable physical iOS/Android and dev checks in `specs/010-mobile-ui-report-polish/quickstart.md`
- [X] T042 Run `git diff --check`, inspect secrets/user-text logging and create thematic commits

## Dependencies

- Phase 2 blocks US1 and US4.
- US1 and US2 can proceed independently after presentation helpers.
- US3 depends only on existing Task store.
- US4 depends on report storage/parser.
- US5 and US6 are independent.
- Verification depends on all stories.

## Implementation Strategy

1. Commit Spec Kit artifacts.
2. Commit shell/orb/sidebar fixes.
3. Commit Dashboard/task presentation and bulk actions.
4. Commit analytics report persistence/formatting.
5. Commit Forever/docs.
6. Commit regression coverage and verification records.

## Phase 10: Convergence

- [X] T043 Add an automated reduced-motion assertion for the orb per FR-006 / T013 (partial)
- [X] T044 Reject invalid owner/date report identities in `src/utils/analyticsReportStorage.ts` per contract: analytics-report-storage (partial)
