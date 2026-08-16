# Tasks: Personal Progress and Analytics

**Input**: Design documents from `/specs/005-personal-progress-analytics/`

## Phase 1: Setup and approval gate

- [X] T001 Obtain explicit owner approval for the additive schema in `specs/005-personal-progress-analytics/data-model.md`; do not edit Prisma schema before approval
- [X] T002 Record the approved migration scope and operator-only apply rule in `specs/005-personal-progress-analytics/quickstart.md`
- [X] T003 Record release checkpoints and exclusions in `docs/product-roadmap.md` without modifying v2.6.0 behavior

## Phase 2: Foundational data and services

**Goal**: Add backward-compatible storage and shared validated date/entitlement helpers used by later stories.

- [X] T004 Add approved User/Task fields and Habit, HabitCheck, StreakRescue, Achievement and AiUsageDaily models in `backend/prisma/schema.prisma`
- [X] T005 Generate and review one additive migration under `backend/prisma/migrations/` without applying it to Neon or Timeweb
- [X] T006 [P] Add strict `YYYY-MM-DD`, duration and identifier validation helpers in `backend/utils/`
- [X] T007 [P] Add Focus/Founder premium entitlement helpers in `backend/services/`
- [X] T008 Create profile/progress/analytics router module shells and mount them through the existing app in `backend/routes/` and `backend/app.js`
- [X] T009 Add shared frontend schemas and response types for preferences, progress, habits, task time and analytics in `src/types/index.ts`

## Phase 3: User Story 1 - Personal Glowy profile (v2.3.0, Priority P1)

**Goal**: Persist a prepared avatar and safe communication tone across devices.

**Independent Test**: Change avatar and tone, reload/sign in elsewhere, send an AI message and verify the selected respectful style without changes to plan or data.

- [X] T010 [P] [US1] Add prepared-avatar and tone catalogs in `backend/constants/profile.constants.js` and `src/constants/profile.ts`
- [X] T011 [P] [US1] Add preference validation and API tests in `backend/test/user-preferences.test.js`
- [X] T012 [US1] Implement authenticated GET/PATCH preference endpoints in `backend/routes/user.routes.js`
- [X] T013 [US1] Build safe tone-specific system instructions in `backend/services/ai/mind-hub.service.js`
- [X] T014 [US1] Pass authenticated user tone through AI routes without changing limits/provider routing in `backend/routes/ai.routes.js`
- [X] T015 [P] [US1] Add preference API client methods in `src/api/UserApi.ts`
- [X] T016 [P] [US1] Add reusable prepared-avatar UI in `src/components/profile/AvatarPicker.tsx`
- [X] T017 [US1] Add avatar and three-state tone controls with loading/error states in `src/pages/SettingsPage.tsx`
- [X] T018 [US1] Synchronize profile preference display with current auth identity in `src/store/useAuthStore.ts` and shared layout components
- [X] T019 [US1] Add frontend preference and respectful-tone behavior tests in `src/pages/SettingsPage.profile.test.tsx` and backend AI service tests

## Phase 4: User Story 2 - Contextual first-use guidance (v2.3.0, Priority P1)

**Goal**: Explain task creation once without a blocking tutorial or duplicate guidance in already clear areas.

**Independent Test**: With fresh local settings, open task creation, close the popover and revisit the form; it does not block the action or reappear.

- [X] T020 [P] [US2] Add versioned onboarding dismissal state/actions in `src/store/useSettingsStore.ts`
- [X] T021 [P] [US2] Create a compact accessible one-time task popover in `src/components/onboarding/FirstUsePopover.tsx`
- [X] T022 [US2] Integrate the one-time popover next to the title field in the existing create-task modal/page
- [X] T023 [P] [US2] Add popover visibility and close-action tests in `src/components/onboarding/FirstUsePopover.test.tsx`
- [X] T024 [P] [US2] Add first-show and reset persistence tests in `src/store/useSettingsStore.test.ts`
- [X] T025 [US2] Add a mobile non-overlap check for the create-task popover

## Phase 5: User Story 3 - Calm personal progress (v2.4.0, Priority P2)

**Goal**: Unite XP, task streak, rescue circles, habits and idempotent achievements in My Progress.

**Independent Test**: Use controlled local dates to complete tasks, protect one missed date, create/check/archive a habit and earn achievements; verify duplicate-safe cross-device results.

- [X] T026 [P] [US3] Implement pure streak, rescue eligibility and habit-streak calculations with unit tests in `backend/services/progress/progress.service.js`
- [X] T027 [P] [US3] Implement idempotent achievement reconciliation with concurrency tests in `backend/services/progress/achievements.service.js`
- [X] T028 [US3] Implement authenticated overview and confirmed rescue endpoints in `backend/routes/progress.routes.js`
- [X] T029 [US3] Implement authenticated habit create/edit/archive/check/uncheck endpoints in `backend/routes/progress.routes.js`
- [X] T030 [US3] Record and clear task completion dates transactionally with existing XP behavior in `backend/routes/task.routes.js`
- [X] T031 [P] [US3] Add progress and habit API clients in `src/api/ProgressApi.ts`
- [X] T032 [P] [US3] Build XP, streak/rescue, habit and achievement panels in `src/components/progress/`
- [X] T033 [US3] Convert `src/pages/SuccessStairsPage.tsx` into the three-tab My Progress composition while preserving `/stairs`
- [X] T034 [US3] Add explicit rescue confirmation and calm success/error feedback in My Progress UI
- [X] T035 [US3] Add backend API tests and a focused Playwright progress/habit flow

## Phase 6: User Story 4 - Optional task time (v2.4.0, Priority P2)

**Goal**: Capture optional planned and actual minutes without adding friction to normal task completion.

**Independent Test**: Create and edit tasks with/without estimates, complete them, save/skip actual time, undo completion and verify old tasks remain valid.

- [X] T036 [P] [US4] Extend task Zod schemas and API payloads with nullable duration/completion fields in `src/types/index.ts` and `src/api/TaskApi.ts`
- [X] T037 [P] [US4] Add backend duration validation and compatibility tests in `backend/test/task-time.test.js`
- [X] T038 [US4] Accept and persist estimated/actual minutes in existing create/update handlers in `backend/routes/task.routes.js`
- [X] T039 [US4] Add optional estimate controls to the existing task create/edit UI
- [X] T040 [US4] Add a dismissible post-completion actual-time prompt without delaying completion
- [X] T041 [US4] Add frontend tests for skip/save/undo and existing task compatibility

## Phase 7: User Story 5 - Useful analytics and premium insight (v2.5.0, Priority P3)

**Goal**: Return trustworthy week/month aggregates, gate AI insight for Focus/Founder users and measure prompt-free AI unit cost.

**Independent Test**: Compare fixed datasets at period boundaries, test empty states and access as Start/Focus/Founder, then inspect aggregate accounting without user text.

- [X] T042 [P] [US5] Implement inclusive week/month aggregate calculations with fixed-dataset tests in `backend/services/analytics/analytics.service.js`
- [X] T043 [P] [US5] Implement token/rate cost calculation and atomic daily aggregate upsert with tests in `backend/services/analytics/ai-usage-accounting.service.js`
- [X] T044 [US5] Attach authenticated successful provider metadata to the accounting service across Mind Hub, task analysis and analytics AI paths
- [X] T045 [US5] Implement authenticated analytics snapshot and premium insight endpoints in `backend/routes/analytics.routes.js`
- [X] T046 [US5] Enforce effective Focus/Founder, global feature flag and explicit opt-in before AI usage consumption
- [X] T047 [P] [US5] Add analytics API client and Zod response validation in `src/api/AnalyticsApi.ts` and `src/types/index.ts`
- [X] T048 [US5] Replace client-only calculations with server snapshots and clear week/month/empty/error states in `src/pages/AnalyticsPage.tsx`
- [X] T049 [US5] Add explicit Focus/Founder AI insight controls with weighted usage without exposing operator cost data
- [X] T050 [US5] Add API access tests, aggregate tests and one focused premium Playwright scenario
- [X] T051 [P] [US3] Track habit creation, rescue use and optional time-entry events without user-authored text in the existing frontend analytics utility and tests

## Phase 8: Polish, documentation and release evidence

- [X] T052 [P] Document avatar/tone/cost-rate public environment configuration in `backend/.env.example`, `README.md` and deploy docs without secret values
- [X] T053 [P] Add release notes for v2.3.0, v2.4.0 and v2.5.0 under `docs/releases/`
- [X] T054 Verify Landing Page remains unchanged, auth changes are limited to v2.3.0 profile response fields, and no v2.6.0 email/OAuth behavior was added
- [X] T055 Run frontend typecheck, lint, unit tests, build and focused Playwright checks; record failures honestly
- [X] T056 Run backend tests and Prisma validation against local/test configuration without connecting to production
- [X] T057 Run Spec Kit consistency and convergence review, update completed task checkboxes and prepare operator migration/dev smoke instructions

## Phase 9: User-requested refinement and release polish

- [X] T058 [US6] Lift actual-time prompt ownership from `TaskItem` to `TaskList` and add a regression test for filtered completed tasks
- [X] T059 [US6] Add stable branded loading states to analytics, streak and habits
- [X] T060 [US6] Add optimistic or explicit pending feedback for task completion and habit mutations without duplicate requests
- [X] T061 [US6] Add Chat to start-route preferences and reorganize Settings into accessible sections
- [X] T062 [US6] Redesign local guidance/cache controls and document their distinct effects in the interface
- [X] T063 [US6] Add persistent desktop sidebar collapse/expand behavior with accessible icon labels
- [X] T064 [US6] Extend progress contracts with entitlement, streak dates, habit check dates and archived habits without a migration
- [X] T065 [US6] Add habit edit, restore and delete API/UI flows and the fixed five-day habit strip
- [X] T066 [US6] Expand the stable achievement catalog to at least ten items with icons, progress and detail dialogs
- [X] T067 [US6] Enforce premium tone and deep analytics for Focus/Founder while keeping streak details available to all authenticated users
- [X] T068 [US6] Add focused frontend/backend tests for progress lifecycle, access control, settings navigation and loading states
- [X] T069 Run typecheck, lint, frontend/backend tests, build and focused Playwright visual checks; update release documentation and task status

## Dependencies

- T001-T005 are the schema gate and block all server-backed user stories.
- T006-T009 establish shared validation/contracts and block T010-T050.
- US1 and US2 form v2.3.0 and can proceed in parallel after foundations.
- US3 and US4 form v2.4.0; task completion dates from T030 are required before reliable streak/analytics work.
- US5 forms v2.5.0 and depends on US3/US4 completion-date and time data.
- v2.6.0 has no task in this file and is not a dependency for v2.3.0-v2.5.0.

## Parallel Opportunities

- T010/T011/T015/T016 can run in parallel before Settings integration.
- T020/T021 can run in parallel, followed by integration into the first task-creation flow.
- T026/T027 and T031/T032 can run in parallel once the data contract exists.
- T036/T037 can run in parallel before backend/UI task-time integration.
- T042/T043/T047 can run in parallel before analytics endpoint/page integration.
- Documentation T052/T053 can run alongside final automated checks after public behavior stabilizes.

## Incremental Delivery Strategy

1. Finish and verify v2.3.0 (US1-US2) before exposing progress changes.
2. Finish and verify v2.4.0 (US3-US4) before relying on its data in analytics.
3. Finish and verify v2.5.0 (US5) with premium access disabled by default until dev smoke tests pass.
4. Keep commits focused by release and concern; do not combine all three versions into one commit.
5. Leave all v2.6.0 email/OAuth work for its later branch and owner-led external setup.
