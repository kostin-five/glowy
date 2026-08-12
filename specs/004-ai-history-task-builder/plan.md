# Implementation Plan: Серверная история Glowy AI

**Branch**: `feature/mobile-glowy-ai` | **Date**: 2026-08-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-ai-history-task-builder/spec.md`

## Summary

Добавить авторизованному пользователю одну серверную историю завершённых AI-обменов и
синхронизируемые черновики задач. Backend резервирует идемпотентный обмен до обращения к AI,
сохраняет успешный ответ и черновики, отдаёт cursor pagination и управляет версиями черновика.
Подтверждение черновика атомарно использует общий task creation service. Frontend заменяет
локальную историю серверной после первой загрузки, но не загружает старые локальные сообщения.

## Technical Context

**Language/Version**: React TypeScript (ES2023) frontend; Node.js ESM backend

**Primary Dependencies**: React, Zustand, Axios, Express 5, express-validator, Prisma 7

**Storage**: Existing PostgreSQL through `backend/lib/prisma.js`; additive tables only

**Testing**: Vitest + Testing Library frontend; Node test runner + Supertest backend; production build

**Target Platform**: Responsive web/PWA; existing Linux backend runtime

**Project Type**: Web application with separate frontend and Express API

**Performance Goals**: First page of history visible within 2 seconds in ordinary stable-network use;
20 exchanges per page; at most 20 recent messages sent to the AI provider

**Constraints**: No production migration/deploy; no private text in logs/analytics; guests remain local;
no parallel auth/AI/task/database architecture; preserve `YYYY-MM-DD | ""` task dates

**Scale/Scope**: One conversation per registered user, one chronological stream, up to five drafts per
exchange and ten subtasks per draft

## Constitution Check

- **I User control — PASS**: AI creates only pending drafts; task creation requires explicit confirm.
- **II Existing architecture — PASS**: Existing auth, AI provider, Task API logic and shared Prisma are
  reused; task creation is extracted into one shared service rather than duplicated.
- **III Data/security — PASS**: Owner derives from authenticated session; no private payload logging;
  migration is additive and will not be applied to production in this work.
- **IV Evidence — PASS**: Frontend unit/integration tests, backend database-free service/HTTP tests,
  typecheck, lint, build and documented manual scenarios are required.
- **V Collaboration — PASS**: Russian copy, explicit contracts, docs update and focused commits.

Post-design re-check: PASS. No justified constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-ai-history-task-builder/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ai-history-api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── api/AiApi.ts
├── components/mind/MindHubChat.tsx
├── components/mind/MindHubDraftCard.tsx
└── store/useMindHubStore.ts

backend/
├── prisma/schema.prisma
├── prisma/migrations/<timestamp>_add_ai_history/migration.sql
├── routes/ai.routes.js
├── routes/task.routes.js
├── services/ai/ai-history.service.js
├── services/ai/ai-history.validation.js
├── services/tasks/task-create.service.js
└── test/
```

**Structure Decision**: Extend the existing frontend AI API/store/components and existing backend
AI and Task boundaries. Data access stays behind the one shared Prisma instance.

## Complexity Tracking

No constitution violations require exceptions.

