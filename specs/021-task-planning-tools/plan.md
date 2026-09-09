# Implementation Plan: Инструменты планирования задач

**Branch**: `codex/task-filters-subtask-drafts` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

## Summary

Добавить чистую модель расширенных фильтров и компактный responsive control на странице задач. Добавить общий AI-контракт и authenticated endpoint для черновика шагов, переиспользующий текущие provider и лимиты, затем встроить один общий редактор черновика в create/edit формы с разными confirm callbacks.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Express 5, ESM
**Primary Dependencies**: Zustand, Zod, Axios, Headless UI, Vitest, Testing Library, Node test runner, Playwright
**Storage**: существующие Task/SubTask в PostgreSQL и offline task store; новых сущностей нет
**Testing**: shared contract, database-free backend route, pure filter, component integration, Playwright, full gates
**Constraints**: Russian UI; explicit confirmation; backend auth/limit; redacted logs; no schema/env/production/LandingPage
**Scale/Scope**: четыре фильтра, один endpoint, один shared draft editor, две form integrations

## Constitution Check

- **I. Контроль**: pass — AI возвращает только редактируемый черновик; мутация отделена подтверждением.
- **II. Архитектура**: pass — существующие AiApi, provider, limit service и subtask store используются повторно.
- **III. Данные**: pass — auth/limit на backend, Zod на границе, нет текста в логах и аналитике, нет миграции.
- **IV. Проверки**: pass — contracts, backend, components и desktop/mobile e2e включены.
- **V. Совместная разработка**: pass — API и rollback документируются, UI остаётся русским.

## Project Structure

```text
packages/contracts/src/ai.ts
backend/routes/ai.routes.ts
backend/services/ai/subtask-draft.service.ts
backend/test/ai-contract-routes.test.ts
src/api/AiApi.ts
src/utils/taskAdvancedFilters.ts
src/components/tasks/TaskAdvancedFilters.tsx
src/components/tasks/AiSubtaskDraft.tsx
src/components/tasks/CreateTaskModal.tsx
src/components/tasks/EditTaskModal.tsx
e2e/task-planning-tools.spec.ts
docs/
```

## Design and Rollback

Фильтрация остаётся pure и локальной странице. Endpoint принимает только поля задачи, нормализует provider JSON и возвращает список с текущим лимитом. Shared editor не знает о persistence: create callback добавляет локальные элементы, edit callback последовательно вызывает существующий `addSubTask` и возвращает failed titles. Rollback — revert feature commits; новых данных, миграций и env нет, уже явно созданные пользователем подзадачи остаются обычными подзадачами.
