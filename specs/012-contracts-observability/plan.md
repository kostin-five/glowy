# Implementation Plan: v2.9.0 — Типы, контракты и наблюдаемость

**Branch**: `codex/v2.9.0-contracts-observability` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-contracts-observability/spec.md`

## Summary

Зафиксировать все 52 текущих HTTP endpoints и их consumers, затем безопасно внедрить общие
проверяемые контракты небольшими slices: AI первым, после независимой проверки — auth, tasks и
payments. AI slice закрывает неавторизованный `/mind-hub/public`, делает резервирование лимита
атомарным для web, notes, analytics и Telegram, добавляет общий timeout budget/circuit breaker и
безопасную наблюдаемость. TypeScript foundation компилирует общий contract package и постепенно
включаемые backend-модули, не требуя одномоментного перевода существующего ESM JavaScript.
Dashboard cleanup входит в тот же release и остаётся отдельной проверяемой UI-задачей.

## Technical Context

**Language/Version**: Frontend TypeScript 6.0 / React 19; backend Node.js 22 LTS, ESM JavaScript с постепенным TypeScript 6.0

**Primary Dependencies**: Express 5, Prisma 7, Zod 4, Axios, Zustand, встроенный `node:test`

**Storage**: PostgreSQL через единственный `backend/lib/prisma.js`; существующая production schema без migration в этом release

**Testing**: backend `node --test` + Supertest, frontend Vitest/Testing Library, TypeScript checks, ESLint, Vite build, существующие Playwright auth/tasks scenarios

**Target Platform**: Web/PWA и Telegram Mini App; backend Ubuntu VPS, Nginx → PM2 → Node.js

**Project Type**: Web application с отдельными frontend/backend packages и общим contract package

**Performance Goals**: Не более одного AI-reservation на одну доступную единицу при 20 параллельных запросах; общий AI provider budget по умолчанию 30 секунд; logging overhead не меняет пользовательский SLA заметно

**Constraints**: Нет production/env/deploy/migration действий без отдельного согласия; нет пользовательских текстов и секретов в логах; AI только после backend auth/entitlement check; task date остаётся `YYYY-MM-DD` или `""`; публичные ответы сохраняются обратно совместимыми кроме явного удаления guest AI

**Scale/Scope**: 52 endpoint operations в 8 продуктовых доменах плюс health; полные implementation slices для AI, auth, tasks, payments; inventory-only для analytics, profile, notes, Telegram за исключением их AI-limit consumers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **User control**: PASS — AI по-прежнему возвращает ответ/черновик; task mutation требует явного подтверждения.
- **Existing architecture**: PASS — сохраняются текущие routes, API clients, provider layer, auth и payment flows; параллельных систем нет.
- **Data/security**: PASS — один Prisma client, backend authority, redaction/allowlist; schema и production data не меняются.
- **Evidence**: PASS — contract/API/concurrency/redaction/provider tests плюс frontend typecheck/lint/tests/build и релевантные e2e.
- **Collaboration/docs**: PASS — русские пользовательские сообщения, endpoint inventory, rollout и rollback; LandingPage не меняется.
- **Incremental TypeScript**: PASS — один домен за slice, механический перенос отделён от изменения поведения.

**Post-design re-check**: PASS. Design не требует исключений из конституции; Complexity Tracking не нужен.

## Project Structure

### Documentation (this feature)

```text
specs/012-contracts-observability/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── endpoint-inventory.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── contracts/                  # backend adapters around shared schemas where required
├── lib/                        # prisma, logger
├── middleware/                 # auth, request ID, error/observability
├── routes/                     # existing thin HTTP handlers
├── services/                   # AI, auth, tasks, billing, analytics, Telegram
├── test/                       # isolated HTTP/contract tests
├── tsconfig.json               # incremental backend/type foundation
└── package.json

packages/contracts/
├── src/                        # shared Zod schemas and inferred public types
├── test/                       # schema compatibility fixtures
├── package.json
└── tsconfig.json

src/
├── api/                        # existing frontend consumers adopt shared contracts per slice
├── components/
├── pages/
├── store/
└── types/

.github/workflows/              # backend typecheck and contract checks in existing CI
```

**Structure Decision**: Сохранить текущие frontend/backend boundaries. Добавить только один
репозиторный `packages/contracts` как источник общих schemas/types. Backend TypeScript build
принимает существующий JavaScript и новые TypeScript-модули; каждый route переходит на shared
contract отдельно. Никаких новых data/auth/AI/payment layers не создаётся.

## Complexity Tracking

Нарушений конституции, требующих исключения, нет.
