# Tasks: Analytics request isolation

Input: spec.md, plan.md, research.md, data-model.md, contracts/ui-contract.md.

## Phase 1: Setup

- [x] T001 Inspect existing AnalyticsApi/report storage/auth types and ignore configuration in src/api/AnalyticsApi.ts, src/utils/analyticsReportStorage.ts, .gitignore and eslint.config.js.

## Phase 2: Foundation

- [x] T002 Add synthetic deferred-promise helpers to src/pages/AnalyticsPage.test.tsx; retain existing report tests.

## Phase 3: US1 account isolation (P1 / MVP)

Independent: account switch or guest exit with pending snapshot/AI cannot show/store stale result.

- [x] T003 [US1] Add loaded/pending account switch, guest and stale AI storage tests in src/pages/AnalyticsPage.test.tsx (FR-001–004,008,010).
- [x] T004 [US1] Key account scope and guard abandoned async callbacks in src/pages/AnalyticsPage.tsx (FR-001–004,008).

## Phase 4: US2 period and retry (P1)

Independent: failed new period has retry and no old cards; delayed retry success/error cannot replace current period.

- [x] T005 [US2] Test period load error/retry and late retry success/error in src/pages/AnalyticsPage.test.tsx (FR-003,005,010).
- [x] T006 [US2] Include period/date in keyed view and isolate retry state in src/pages/AnalyticsPage.tsx (FR-001–003,005).

## Phase 5: US3 AI pending (P2)

Independent: regeneration retains old report with live status and disabled delete/duplicate; failed request restores controls.

- [x] T007 [US3] Test AI pending/duplicate, period switch, errors and saved report in src/pages/AnalyticsPage.test.tsx (FR-004,006–008,010).
- [x] T008 [US3] Add immediate request lock, pending status and disabled delete/regenerate in src/pages/AnalyticsPage.tsx (FR-006,007,009).

## Phase 6: Verification and handoff

- [x] T009 Add mocked desktop/mobile browser retry and pending flow in e2e/analytics-request-isolation.spec.ts (FR-005–010, SC-001–004).
- [x] T010 Run frontend typecheck/lint/tests/build and full Playwright; record evidence/limitations in specs/018-analytics-request-isolation/quickstart.md (SC-001–004).
- [x] T011 Update bounded local status in docs/product-roadmap.md, converge, commit and locally merge dev without push (all FR/SC).

## Dependencies and strategy

T001 → T002 → US1 → US2 → US3 → T009–T011. Tests precede corresponding implementation.
US1 is MVP, each story has an independent scenario. No parallel agent work: page/tests share files.
Within each story tests run sequentially; after code settles, independent typecheck/lint can run
in parallel, and browser specification T009 can be reviewed alongside unit test results.
