# Implementation Plan: Backend TypeScript Migration

**Branch**: `codex/v2.10.0-backend-typescript` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-backend-typescript-migration/spec.md`

## Summary

Перевести 95 отслеживаемых JavaScript-файлов основного backend (46 runtime/support и 49 tests) на строгий TypeScript без изменения HTTP-контрактов, бизнес-логики, схемы БД или инфраструктурной топологии. Миграция выполняется небольшими механическими срезами поверх существующей архитектуры; `tsc` компилирует смешанное дерево в `backend/dist`, Node.js запускает только скомпилированный ESM JavaScript, а финальный gate запрещает оставшиеся `.js`-исходники в согласованной области. `ai-proxy/server.js` не входит в релизный gate v2.10.0.

## Technical Context

**Language/Version**: Node.js 22.22, TypeScript 6.0, ESM, target ES2023

**Primary Dependencies**: Express 5, Prisma 7, Zod, jsonwebtoken, Nodemailer; без нового runtime TypeScript loader

**Storage**: PostgreSQL через существующий единственный `backend/lib/prisma.js`; схема и migrations не меняются

**Testing**: Node test runner + Supertest (backend), Vitest (frontend), Playwright smoke/E2E; `tsc --noEmit`, lint и production build

**Target Platform**: Linux/Timeweb, Nginx + PM2 + Node.js; локальная разработка на Node.js 22

**Project Type**: Web application: React frontend + Express backend + отдельный исключённый из scope AI proxy

**Performance Goals**: Нулевая намеренная регрессия API latency/throughput; TypeScript отсутствует в production hot path после компиляции

**Constraints**: Без изменения поведения, API contracts, БД, auth/payments/AI/Telegram правил; без широких `any`; секреты и пользовательские тексты не попадают в логи; каждый срез отдельно проверяем и откатываем

**Scale/Scope**: 95 tracked `.js` файлов в `backend/`: 46 runtime/support + 49 tests; frontend меняется только при необходимости сохранить типизацию потребителей

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Calm planning / no silent mutation**: PASS. Механическая миграция не меняет пользовательские сценарии и не добавляет мутации.
- **Backend authority**: PASS. Auth, тарифы, AI-лимиты, Telegram и оплаты остаются в существующих backend-модулях.
- **Single Prisma client**: PASS. Импорты продолжают идти только через `backend/lib/prisma` (после переименования — тот же модуль и singleton).
- **Contracts and validation**: PASS. Зафиксированные v2.9.0 request/response/error contracts сохраняются; внешние данные типизируются как `unknown` и сужаются на границах.
- **Small reversible changes**: PASS. Работа разбита на foundation и доменные срезы; механический перенос не смешивается с изменением поведения.
- **Security and production safety**: PASS. Нет чтения секретов, migrations, deploy, production DB/env или внешних сервисов.
- **Verification**: PASS. Для каждого среза обязательны backend typecheck/tests; на контрольных точках — frontend typecheck/lint/tests/build и smoke-проверки.
- **Roadmap alignment**: PASS. Работа соответствует утверждённой границе v2.10.0 в `docs/product-roadmap.md`.

**Post-design re-check**: PASS. Решения Phase 1 не вводят новую архитектуру, хранилище или production-сервис; компиляция в `dist` является build-этапом существующего backend.

## Project Structure

### Documentation (this feature)

```text
specs/013-backend-typescript-migration/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── migration-gates.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app.ts
├── server.ts
├── contracts/            # существующие Zod/TS HTTP contracts
├── lib/                  # shared Prisma, logger, helpers
├── middleware/           # Express auth/request boundaries
├── routes/               # тонкие HTTP handlers по существующим доменам
├── services/ai/          # существующий AI provider/parser/limits flow
├── telegram/             # существующие bot/webhook/worker helpers
├── test/                 # Node/Supertest tests, также переводятся в TS
├── types/                # ambient/module declarations и boundary types
├── scripts/              # проверяемые operational scripts
├── tsconfig.json         # строгий no-emit gate
├── tsconfig.build.json   # компиляция mixed-state/final source в dist
└── dist/                 # ignored build output, не источник истины

src/                      # React + TypeScript frontend; contracts consumers
ai-proxy/server.js        # отдельный компонент, вне gate v2.10.0
```

**Structure Decision**: Сохраняется текущая плоская структура backend и существующие границы модулей. Новые параллельные слои не создаются; файлы переименовываются на месте, а `dist` содержит только воспроизводимый результат компиляции.

## Complexity Tracking

Конституционных нарушений нет; исключения, требующие архитектурного оправдания, не вводятся.
