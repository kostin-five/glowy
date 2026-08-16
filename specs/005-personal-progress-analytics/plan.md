# Implementation Plan: Personal Progress and Analytics

**Branch**: `codex/versions-2.3.0-2.5.0` | **Date**: 2026-08-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-personal-progress-analytics/spec.md`

## Summary

Deliver three incremental releases on the existing Glowy frontend/backend boundary. v2.3.0 adds server-owned avatar and tone preferences plus device-local contextual hints. v2.4.0 extends tasks with completion/time data and adds separate habit, rescue and achievement records behind a reusable progress service. v2.5.0 moves user analytics to server-owned aggregates, adds Focus/Founder AI explanations behind a global flag and explicit opt-in, and records prompt-free daily AI usage totals. The work uses one additive Prisma migration prepared in git but never applied to dev or production by the agent.

## Technical Context

**Language/Version**: React 19 + TypeScript 5 frontend; Node.js 22 ESM backend

**Primary Dependencies**: React Router, Zustand, Axios, Zod, Recharts, Express 5, express-validator, Prisma 7

**Storage**: Existing PostgreSQL database through `backend/lib/prisma.js`; one additive migration gated by owner approval and Timeweb backup

**Testing**: Vitest and Testing Library frontend tests, Node test runner backend unit/API tests, Playwright focused flows

**Target Platform**: Browser frontend on Vercel/Timeweb; Node backend on Render/Timeweb; responsive desktop and mobile UI

**Project Type**: Full-stack web application using the existing AI provider and subscription flows

**Performance Goals**: Profile and progress endpoints return in one database round trip group; analytics uses bounded period queries; AI accounting adds at most one aggregate upsert per successful authenticated AI request; no blocking tutorial on first render

**Constraints**: Russian UI; prepared avatars only; AI remains advisory; backend owns access and aggregates; no prompts in usage records; Founder receives premium entitlement; Landing Page and v2.6.0 auth behavior remain unchanged; migration is prepared but not applied

**Scale/Scope**: Three release checkpoints, five new tables plus additive User/Task fields, three route areas, existing settings/progress/analytics pages, focused tests and operational docs

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- User control is preserved: hints dismiss, rescue use requires confirmation, task time is optional, and AI explanation never mutates tasks.
- Existing architecture is extended: current auth middleware, shared Prisma, task flow, AI provider layer, plan normalization and pages are reused.
- Backend remains authoritative for preferences, streaks, habits, achievements, premium access and AI accounting.
- No prompt, response, task title or habit title is stored in AI usage aggregates or sent to analytics AI.
- The schema change is additive and backward compatible; applying it remains blocked until explicit owner approval and backup confirmation.
- Focused unit/API/e2e evidence is planned for data, AI access, mobile flow and old-record compatibility.
- Public behavior, migration instructions and environment rates are documented.
- Landing Page, payment checkout and v2.6.0 email/OAuth paths are out of scope.

## Project Structure

### Documentation (this feature)

```text
specs/005-personal-progress-analytics/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── profile-progress-analytics.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── UserApi.ts
│   ├── ProgressApi.ts
│   ├── AnalyticsApi.ts
│   └── TaskApi.ts
├── components/
│   ├── onboarding/
│   ├── profile/
│   ├── progress/
│   └── tasks/
├── constants/profile.ts
├── pages/
│   ├── SettingsPage.tsx
│   ├── SuccessStairsPage.tsx
│   └── AnalyticsPage.tsx
├── store/
│   ├── useAuthStore.ts
│   └── useSettingsStore.ts
└── types/index.ts

backend/
├── constants/profile.constants.js
├── routes/
│   ├── user.routes.js
│   ├── progress.routes.js
│   ├── analytics.routes.js
│   ├── task.routes.js
│   └── ai.routes.js
├── services/
│   ├── progress/
│   │   ├── progress.service.js
│   │   └── achievements.service.js
│   ├── analytics/
│   │   ├── analytics.service.js
│   │   └── ai-usage-accounting.service.js
│   └── ai/
│       ├── mind-hub.service.js
│       └── ai-provider.service.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── app.js

docs/
```

**Structure Decision**: Keep route handlers thin and add progress/analytics modules because each owns distinct aggregate business rules. Continue to use the existing task route for task completion/time and existing user route for profile preferences. No new deployable service, client state architecture or payment flow is introduced.

## Refinement Plan

- Lift actual-time state from `TaskItem` into `TaskList` so task filtering cannot close the dialog, and make task/habit controls expose an immediate pending state.
- Extend the existing progress response with active and archived habits, five-day check dates, current streak dates, entitlement flags and a presentation-ready achievement catalog. These additions reuse current tables and require no migration.
- Recompose Settings around anchored sections, add Chat to the existing start-route preference and persist a compact desktop sidebar state in the current settings store.
- Keep weekly/monthly AI explanations behind Focus/Founder entitlement and charge five or ten daily usage units only after a successful provider response. Keep configurable tone premium while streak details remain available to every authenticated user.
- Add focused frontend/backend tests for disappearing dialogs, premium bypass attempts, habit lifecycle, achievement progress and response validation before full verification.

## Migration Gate

The implementation depends on one additive Prisma migration. Before editing `schema.prisma` or creating migration SQL, obtain explicit owner approval for the proposed fields and tables in [data-model.md](data-model.md). The agent may generate and test migration files against local/test data after approval, but may not run them against Neon or Timeweb. Production apply requires a fresh Timeweb backup and a separate explicit deployment instruction.

## Complexity Tracking

No constitution violations require justification.
