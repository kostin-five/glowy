# Tasks: Инструменты планирования задач

## Phase 1: Contracts and tests

- [x] T001 Зафиксировать shared request/response contract AI-шагов и contract tests
- [x] T002 [P] Добавить pure tests для комбинированных фильтров
- [x] T003 [P] Добавить database-free backend route tests: auth, validation, limit, release, success
- [x] T004 [P] Добавить component tests для draft/cancel/confirm/partial result

## Phase 2: Filters

- [x] T005 Реализовать pure filter model в `src/utils/taskAdvancedFilters.ts`
- [x] T006 Реализовать responsive control и active count в `src/components/tasks/TaskAdvancedFilters.tsx`
- [x] T007 Подключить фильтры к `TaskPage`/`TaskList` без изменения store persistence

## Phase 3: AI subtask draft

- [x] T008 Реализовать строгую нормализацию и prompt в `backend/services/ai/subtask-draft.service.ts`
- [x] T009 Добавить authenticated limited endpoint в существующий AI router
- [x] T010 Расширить `AiApi` общим валидированным методом
- [x] T011 Реализовать общий локальный редактор черновика
- [x] T012 Подключить create-flow без persistence до общего submit
- [x] T013 Подключить edit-flow с уникальностью и честным partial retry

## Phase 4: Verification and documentation

- [x] T014 Добавить desktop/mobile Playwright сценарии
- [x] T015 Выполнить contracts/backend/frontend/typecheck/lint/unit/build/e2e gates
- [x] T016 Обновить roadmap, architecture, onboarding и handoff 2026-09-04

## Dependencies

T001–T004 → T005–T013 → T014–T016. Фильтры и backend service независимы до UI integration.
