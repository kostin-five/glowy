# Implementation Plan: AI Providers and Founder Plan

**Branch**: `codex/v2.2.1-ai-founder` | **Date**: 2026-08-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-ai-founder/spec.md`

## Summary

Move AI execution into a provider-neutral backend service with direct DeepSeek as primary and GigaChat as a single conditional fallback. Remove Gemini-specific active code, normalize provider failures, and cover routing/token behavior with isolated tests. Preserve the legacy `forever` database value while presenting old free lifetime entitlements as Founder, close free activation, and stage a disabled paid Forever configuration in the existing YooKassa flow without a migration.

## Technical Context

**Language/Version**: React 19 + TypeScript 5 frontend; Node.js 22 ESM backend

**Primary Dependencies**: Express 5, Prisma 7, native `fetch`, Axios, React Router, Zustand

**Storage**: Existing PostgreSQL schema through shared Prisma client; no schema change

**Testing**: Node test runner for backend services, Vitest for frontend, Playwright smoke checks

**Target Platform**: Browser frontend on Vercel/Timeweb; Node backend on Render/Timeweb

**Project Type**: Full-stack web application with optional rollback AI proxy

**Performance Goals**: No fallback latency after a successful primary response; one fallback attempt maximum; cached GigaChat token reused until shortly before expiry

**Constraints**: Secrets remain backend-only; no parallel successful provider calls; no Prisma migration; paid Forever disabled by default; production actions require the user

**Scale/Scope**: One shared AI entry service, three AI call paths, pricing/settings/current-plan UI, shared YooKassa payment route, environment and operations docs

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- Calm UX is preserved: provider failures remain neutral and actionable.
- AI remains advisory and does not mutate user data silently.
- Secrets stay outside the frontend and logs.
- Billing and entitlement enforcement remain on the backend.
- Existing payment verification and idempotency rules are reused.
- No migration or production data operation is planned.
- Provider and plan behavior receives focused automated tests.
- Operational and environment documentation is updated with the implementation.

## Project Structure

### Documentation (this feature)

```text
specs/004-ai-founder/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── payments-and-ai.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── routes/
│   ├── ai.routes.js
│   └── payment.routes.js
├── services/ai/
│   ├── ai-provider.service.js
│   ├── ai-provider.service.test.js
│   ├── ai-limits.service.js
│   └── mind-hub.service.js
└── utils/ai-errors.utils.js

src/
├── api/
│   ├── AiApi.ts
│   └── PaymentApi.ts
└── pages/
    ├── PricingPage.tsx
    ├── SettingsPage.tsx
    ├── OfferPage.tsx
    └── TermsOfServicePage.tsx

ai-proxy/                 # rollback-only until live direct-provider smoke tests pass
docs/
README.md
```

**Structure Decision**: Keep the existing frontend/backend split and the single AI provider boundary. Do not introduce a new service or persistence layer. Keep the proxy only as a temporary rollback deployment and remove its Gemini-specific implementation.

## Complexity Tracking

No constitution violations require justification.
