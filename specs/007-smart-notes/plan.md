# Implementation Plan: Умные заметки

**Branch**: `codex/v2.7.0-smart-notes` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-smart-notes/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Добавить авторизованным пользователям простые текстовые заметки с поиском,
архивом, надёжным сохранением, ручными связями с задачами и AI-черновиком
задачи. Решение расширяет существующие React/Express/Prisma/task/AI flows:
аддитивные таблицы заметок и связей, изолированные notes routes, один frontend
API client и страница редактора. AI только предлагает редактируемый черновик;
подтверждённая задача создаётся backend-транзакцией и связывается с заметкой.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 6 / React 19 на frontend; ESM JavaScript / Node.js на backend

**Primary Dependencies**: React Router, Axios, Zustand, Express 5, express-validator, Prisma 7, существующий AI provider layer

**Storage**: PostgreSQL через общий `backend/lib/prisma.js`; локальная migration только подготавливается и не применяется

**Testing**: Vitest + Testing Library; Node test runner + Supertest; TypeScript, ESLint, Vite build

**Target Platform**: Адаптивное web-приложение в современных desktop/mobile браузерах; Node backend

**Project Type**: Web application (frontend + REST backend)

**Performance Goals**: Поиск до 500 заметок отображается пользователю ≤2 с; сохранение не блокирует ввод; список загружается одной страницей в MVP

**Constraints**: Русский UI; строгая изоляция по `userId`; AI не мутирует данные без подтверждения; без offline-очереди заметок; без production/dev migration

**Scale/Scope**: Одна notes page с list/editor; до 500 заметок на пользователя в проверочном наборе; заголовок ≤200, текст ≤50 000, AI-фрагмент ≤4 000 символов

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Контроль пользователя — PASS**: AI возвращает только черновик; создание
  задачи выполняется отдельным подтверждённым запросом.
- **Существующая архитектура — PASS**: используются текущие auth middleware,
  shared Prisma client, task model/API conventions и AI provider/limits.
- **Данные и секреты — PASS**: каждый notes/task-link запрос ограничен владельцем;
  пользовательский текст не логируется; migration аддитивна и не применяется.
- **Доказательства — PASS**: запланированы route isolation/validation/AI tests,
  frontend tests и полные typecheck/lint/test/build.
- **Совместная разработка — PASS**: русский UI, узкая feature-ветка, обновление
  roadmap/handoff после готовности.

Post-design check: PASS. Контракты сохраняют backend как источник истины,
атомарное подтверждённое создание задачи и изоляцию связей по владельцу.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
├── api/NoteApi.ts
├── components/notes/
├── components/tasks/TaskItem.tsx
├── pages/NotesPage.tsx
├── types/
└── App.tsx

backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/<timestamp>_add_smart_notes/migration.sql
├── routes/notes.routes.js
├── services/ai/note-task-draft.service.js
├── test/notes-routes.test.js
└── app.js
```

**Structure Decision**: Сохранить текущую двухчастную структуру. Frontend
компонует экран и API client, backend route отвечает за валидацию, ownership и
транзакции, AI service использует действующий provider. Новые слои хранилища,
auth или глобальный store для заметок не нужны.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
Нарушений конституции нет.
