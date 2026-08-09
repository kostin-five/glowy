# Implementation Plan: Quality Baseline v2.1.0

**Branch**: `codex/v2.1.0-quality-baseline` | **Date**: 2026-08-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-quality-baseline/spec.md`

## Summary

Укрепить существующий React/Express продукт перед v2.2.0: изолировать ошибки интерфейса,
сделать безопасные события Яндекс.Метрики, стандартизировать диагностические серверные логи,
расширить проверки и CI, а также оформить операционную документацию. Решение использует текущие
frontend, backend, cookie-consent и GitHub Actions; новая production-БД, новый AI/payment-flow и
внешний мониторинг не добавляются.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 6 / React 19 / Vite 8 frontend; ESM JavaScript / Express 5
backend; Node.js 22 in CI.

**Primary Dependencies**: React Router, Zustand, Axios, Vitest, Playwright; Express, Prisma and
PostgreSQL. No new production runtime dependency is required for error logging.

**Storage**: Existing PostgreSQL production data is out of scope; browser consent state already
uses localStorage. UTM data is transient client analytics context and must not contain user text.

**Testing**: Vitest for current frontend unit tests; Playwright for browser flows; a minimal
backend test runner and HTTP test helper for routes that do not require production data.

**Target Platform**: Modern desktop and mobile browsers; Linux GitHub Actions runner; existing
Timeweb backend deployment remains unchanged until an explicitly approved deploy.

**Project Type**: React single-page web application plus Express API.

**Performance Goals**: Preserve the existing code-split route startup; identify regressions using
build output and a manual mobile check rather than inventing unverified performance targets.

**Constraints**: Do not change production schema, payment flows, AI-limit enforcement or Landing
Page copy without an explicit product approval. Logs and analytics must exclude secrets and
personal user content. Backend tests must not reach Timeweb production data.

**Scale/Scope**: One quality release across existing frontend, backend, CI and docs. The next
AI interaction release (v2.2.0) is intentionally excluded.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Result | Notes |
|------|--------|-------|
| User control | Pass | This release adds recovery and measurement only; it does not let AI mutate user data. |
| Existing architecture | Pass | Reuses the current React app, Express server, cookie consent and GitHub Actions. |
| Data, money and secrets | Pass | No schema/payment changes. Event allowlist and structured logs exclude secrets and user text. |
| Evidence before release | Pass | Adds focused browser coverage, CI build validation and a reproducible release checklist. |
| Clear collaboration | Pass | Produces contracts, quickstart and operations documentation for future contributors. |

**Post-design re-check**: Pass. The design introduces no extra Prisma client, no database migration,
no production credential and no parallel flow.

## Project Structure

### Documentation (this feature)

```text
specs/001-quality-baseline/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── components/
│   └── ui/                # Error boundary and recovery presentation
├── pages/                 # Existing routes and approved CTA instrumentation
├── store/                 # Existing auth and task state
├── utils/                 # Consent-aware analytics helper and unit tests
└── App.tsx                # App-level error-boundary placement

backend/
├── app.js                 # Express application construction, exportable for tests
├── server.js              # Production listener only
├── lib/logger.js          # Structured, redacted server diagnostics
├── middleware/            # Request ID and global error handling
└── test/                  # HTTP tests with no Timeweb production dependency

e2e/                       # Playwright desktop and mobile user paths
.github/workflows/ci.yml   # Frontend build and browser checks in CI
docs/
├── architecture.md        # Current system boundaries and data flows
└── release-checklist.md   # Pre-deploy and post-deploy validation
```

**Structure Decision**: Keep the existing single repository with `src/`, `backend/` and
`ai-proxy/`. Shared client concerns live under `src/components` or `src/utils`; backend request
construction becomes exportable from its listener so HTTP tests can run without a real server or
production database.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |
