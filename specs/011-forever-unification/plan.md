# Implementation Plan: Единый пожизненный тариф Forever

**Branch**: `codex/v2.8.0-forever-unification` | **Date**: 2026-08-29 | **Spec**: [spec.md](spec.md)

## Summary

Убрать публичный alias Founder и бесплатный lifetime mutation-path, сохранив существующее значение `forever`, бессрочные права и лимит 100. Изменение переиспользует текущие billing/AI/access функции, не создаёт миграцию и не включает будущий платный Forever.

## Technical Context

**Language/Version**: React 19 + TypeScript 6 frontend; Node.js ESM backend
**Primary Dependencies**: React Router, Zustand, Axios, Express, Prisma
**Storage**: существующая PostgreSQL `User.plan`; schema без изменений
**Testing**: Vitest, Node test runner + Supertest, Playwright
**Target Platform**: responsive PWA/web, Telegram Mini App, Express API
**Project Type**: frontend + backend web application
**Performance Goals**: без дополнительных запросов или latency относительно текущего plan resolution
**Constraints**: не менять Focus checkout/webhook; не применять migration; не включать платный Forever; русский пользовательский текст
**Scale/Scope**: billing entitlement service, payment activation route/API client, AI/access checks, текущие UI/legal/docs и focused tests

## Constitution Check

- **I Контроль пользователя — PASS**: удаляется автоматическая бесплатная мутация тарифа.
- **II Существующая архитектура — PASS**: используется текущий `forever`, billing service и payment router; новых flow нет.
- **III Данные, деньги и секреты — PASS**: доступ и лимиты остаются backend; Focus/YooKassa не меняются; БД не мигрирует.
- **IV Доказательства — PASS**: нужны route/service/frontend/e2e regression tests и полный прогон.
- **V Совместная разработка — PASS**: актуальная терминология и operational docs обновляются тематически.

## Project Structure

```text
specs/011-forever-unification/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/lifetime-plan.md
└── tasks.md

backend/
├── routes/payment.routes.js
├── services/billing/plan-entitlements.service.js
├── services/ai/ai-limits.service.js
└── test/

src/
├── api/PaymentApi.ts
├── pages/{PricingPage,SettingsPage,AnalyticsPage,OfferPage,TermsOfServicePage}.tsx
└── types/

docs/
├── architecture.md
├── product-roadmap.md
└── ai-unit-economics.md
```

**Structure Decision**: узкое изменение существующих plan-resolution и presentation touch-points. Исторические release notes не переписываются.

## Design Decisions

1. `forever` остаётся единственным stored/public plan; alias `founder` удаляется.
2. Legacy `POST /api/payments/forever/activate` остаётся совместимым URL, но всегда возвращает `410 PLAN_UNAVAILABLE` до чтения/записи пользователя.
3. `PaymentApi.activateFounderPlan` удаляется, так как UI больше не имеет этого действия.
4. Будущий платный `/forever/create` остаётся за существующим выключенным feature flag и не включается.
5. Existing Forever entitlement определяется активным статусом и отсутствием expiry так же, как сейчас; лимит 100 сохраняется.

## Post-Design Constitution Check

PASS. Нет schema/env/provider/payment verification изменений; Focus checkout/webhook и production не затрагиваются.

## Complexity Tracking

No constitution violations require exceptions.
