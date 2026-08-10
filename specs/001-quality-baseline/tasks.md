---
description: "Actionable tasks for Quality Baseline v2.1.0"
---

# Tasks: Quality Baseline v2.1.0

**Input**: Design documents from `specs/001-quality-baseline/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/) and [quickstart.md](quickstart.md)

**Tests**: Required. The release explicitly includes focused unit, HTTP and browser checks.

**Organization**: Tasks are grouped by user story. Tasks marked `[P]` touch separate files and can
be done in parallel after their dependencies are met.

## Phase 1: Setup

**Purpose**: Prepare test commands and preserve the v2.1 baseline without contacting production
systems.

- [X] T001 [P] Add frontend test dependencies and test setup required for component recovery tests in `package.json`, `package-lock.json` and `vite.config.ts`.
- [X] T002 [P] Add a backend test command and HTTP test dependency in `backend/package.json` and `backend/package-lock.json` without adding a production dependency.
- [X] T003 Record the initial dependency-audit findings and the policy against blind upgrades in `docs/release-checklist.md`.

---

## Phase 2: Foundational Quality Infrastructure

**Purpose**: Establish safe diagnostics and reusable test seams before user-story work.

**⚠️ CRITICAL**: No backend HTTP test may use the Timeweb production database or production
credentials.

- [X] T004 Create a redacting structured logger in `backend/lib/logger.js` according to `contracts/error-logging.md`.
- [X] T005 Add request ID and global error middleware in `backend/middleware/request-id.middleware.js` and `backend/middleware/error.middleware.js`.
- [X] T006 Extract Express application construction from `backend/server.js` into `backend/app.js`, preserving current CORS, CSRF, health and route behavior.
- [X] T007 Add a reusable consent-aware analytics helper and allowlist in `src/utils/analytics.ts` according to `contracts/analytics-events.md`.
- [X] T008 [P] Add unit coverage for the analytics allowlist, consent guard and sensitive-payload filtering in `src/utils/analytics.test.ts`.
- [X] T009 [P] Add HTTP coverage for health, rejected origin, generic error handling and request IDs in `backend/test/app.test.js`.

**Checkpoint**: Application construction is testable, diagnostics are safe by default, and frontend
instrumentation has one approved entry point.

---

## Phase 3: User Story 1 - Reliable Core Entry (Priority: P1) 🎯 MVP

**Goal**: A public visitor can enter Glowy on desktop or mobile, while a rendering failure in one
screen has a calm recovery state instead of taking down the application.

**Independent Test**: Run focused component tests and the public Playwright suite in Chromium and
the configured mobile viewport.

### Tests for User Story 1

- [X] T010 [P] [US1] Add component tests for an isolated render failure and retry recovery in `src/components/ui/AppErrorBoundary.test.tsx`.
- [X] T011 [P] [US1] Extend public browser coverage for the registration path at desktop and mobile sizes in `e2e/landing.smoke.spec.ts`.

### Implementation for User Story 1

- [X] T012 [US1] Implement a reusable Russian recovery boundary in `src/components/ui/AppErrorBoundary.tsx` without exposing internal errors to users.
- [X] T013 [US1] Place the boundary around lazy route content in `src/App.tsx` while preserving auth restoration, route loading and existing redirects.
- [X] T014 [US1] Confirm no unapproved Landing Page copy/design change is included in `src/pages/LandingPage.tsx`; only add CTA instrumentation after explicit copy approval.

**Checkpoint**: Public entry and registration remain independently testable in both viewports, and a
controlled local rendering failure preserves an actionable recovery UI.

---

## Phase 4: User Story 2 - Consent-Aware Product Measurement (Priority: P2)

**Goal**: The team can measure activation through an allowlisted, consent-aware event flow without
sending user text or secrets to analytics.

**Independent Test**: With a mocked Metrika function, verify every allowed event only sends after
consent and rejects unapproved payload fields; manually inspect an accepted and rejected session.

### Tests for User Story 2

- [X] T015 [P] [US2] Add focused tests for registration, first-task and first-AI event triggers in `src/store/useAuthStore.test.ts`, `src/store/useTaskStore.test.ts` and `src/api/AiApi.test.ts` where each trigger is introduced.
- [X] T016 [P] [US2] Add a browser scenario for accepted and rejected analytics consent in `e2e/analytics-consent.spec.ts` without asserting on private user content.

### Implementation for User Story 2

- [X] T017 [US2] Refactor `src/components/CookieConsent.tsx` to share the consent source with `src/utils/analytics.ts` and preserve the current delayed Metrika initialization behavior.
- [X] T018 [US2] Instrument registration start/completion, first task creation and first AI request through `src/store/useAuthStore.ts`, `src/store/useTaskStore.ts` and `src/api/AiApi.ts` using only the allowlisted helper.
- [X] T019 [US2] Instrument the existing Focus checkout start in `src/pages/PricingPage.tsx` through the allowlisted helper.
- [X] T020 [US2] Update consent wording and analytics scope in `src/pages/PrivacyPolicyPage.tsx` and `src/pages/PersonalDataConsentPage.tsx` to match the actual event contract.
- [ ] T021 [US2] After user approval of the exact CTA scope, instrument only the primary landing CTA in `src/pages/LandingPage.tsx`; do not redesign or alter unrelated landing copy.

**Checkpoint**: Accepted sessions emit only approved events and optional UTM labels; rejected sessions
continue through core product paths without product analytics.

---

## Phase 5: User Story 3 - Predictable Release Checks (Priority: P3)

**Goal**: Developers receive one reproducible local and CI signal for code quality and can inspect a
useful report when a browser check fails.

**Independent Test**: Run each documented command on a clean branch and verify CI includes the same
checks for pull requests to `dev` and `master`.

### Tests for User Story 3

- [X] T022 [P] [US3] Add a test proving backend unexpected errors return the generic public response and retain only redacted diagnostics in `backend/test/app.test.js`.
- [X] T023 [P] [US3] Verify the existing Playwright configuration keeps trace and screenshot artifacts only on a failure in `playwright.config.ts`.

### Implementation for User Story 3

- [X] T024 [US3] Replace route-level raw error output in touched backend paths with `backend/lib/logger.js`, preserving known safe operational fields only.
- [X] T025 [US3] Add `npm run build` to `.github/workflows/ci.yml` before browser checks and keep Playwright reports available when relevant checks fail.
- [X] T026 [US3] Add backend test execution to local documentation only; add it to CI after its dependencies and isolated test behavior are verified in `backend/package.json` and `.github/workflows/ci.yml`.
- [X] T027 [US3] Document the required post-dev-deploy smoke procedure using the existing public frontend and `/api/health` endpoint in `docs/release-checklist.md`.

**Checkpoint**: A contributor can run the same quality sequence locally and on a pull request
without deploy access or production data.

---

## Phase 6: Documentation, Performance and Release Readiness

**Purpose**: Make the release understandable, measurable and safe to hand off.

- [X] T028 [P] Document frontend, backend, PostgreSQL, AI-proxy and YooKassa boundaries in `docs/architecture.md`.
- [X] T029 [P] Update the v2.1 release scope and any changed user-facing commitments in `docs/product-roadmap.md` and `docs/releases/v2.1.0-quality-baseline.md`.
- [X] T030 Measure the current production build output and public mobile entry at 360, 390 and 430 px; record only reproducible bottlenecks and focused fixes in `docs/releases/v2.1.0-quality-baseline.md`.
- [ ] T031 Configure Metrika goals and saved report manually in the Yandex interface using the exact names from `contracts/analytics-events.md`.
- [ ] T032 Verify index coverage, sitemap, robots, canonical host and crawl errors manually in Yandex Webmaster and Google Search Console; record findings in `docs/releases/v2.1.0-quality-baseline.md`.
- [X] T033 Run the complete quickstart validation in `specs/001-quality-baseline/quickstart.md`, then run `git diff --check` and record skipped checks or known risks in the release notes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on test setup where relevant; establishes reusable logger,
  app construction and analytics helper.
- **US1 (Phase 3)**: Depends on frontend component test setup; can start alongside backend
  foundation once T001 is complete.
- **US2 (Phase 4)**: Depends on T007 and T008; no database migration is needed.
- **US3 (Phase 5)**: Depends on T004-T006 and initial Playwright baseline.
- **Release readiness (Phase 6)**: Depends on all selected stories; T031 and T032 require the
  product owner's access to Yandex/Google panels.

### User Story Dependencies

- **US1 (P1)**: Independent after frontend test setup and is the release MVP.
- **US2 (P2)**: Requires the analytics helper but not US1.
- **US3 (P3)**: Requires backend foundation but not US1 or US2.

### Parallel Opportunities

- T001 and T002 affect separate package files and can proceed in parallel.
- T008 and T009 can be written after their matching foundation contracts are stable.
- After foundation, US1 UI work, US2 event work and US3 CI/docs work can be divided by file area.
- T028 and T029 are documentation tasks that can run in parallel with final validation.

## Implementation Strategy

### MVP First

1. Complete frontend test setup and the reusable error boundary.
2. Validate desktop and mobile public entry plus recovery behavior.
3. Commit this independently working P1 increment before wider analytics or backend logging work.

### Incremental Delivery

1. Add P1 recovery and public-path confidence.
2. Add P2 consent-aware activation measurement and verify it manually in Metrika.
3. Add P3 structured diagnostics, backend HTTP tests and CI build gating.
4. Finish documentation, external-console checks and release validation.

### Explicit Product Owner Tasks

- T021 requires approval of the exact primary CTA to instrument if `LandingPage.tsx` is changed.
- T031 requires access to the Yandex Metrika account to create goals and the saved report.
- T032 requires access to Yandex Webmaster and Google Search Console.
- Any external error-monitoring provider, production deployment, migration or payment activation
  requires separate approval and is not automatic in this release.
